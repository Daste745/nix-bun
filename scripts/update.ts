import {
	type BunSystemTuple,
	type NixSystemTuple,
	nixToBunSystem,
} from "./util";

type Release = {
	id: string;
	name: string | null;
	tag: string;
	assets: Asset[];
};

type Asset = {
	id: string;
	name: string;
	browserDownloadUrl: string;
};

async function fetchReleases(): Promise<Release[]> {
	const res = await fetch("https://api.github.com/repos/oven-sh/bun/releases");
	// biome-ignore lint/suspicious/noExplicitAny: API response
	const json = (await res.json()) as any[];
	return json.map((d) => ({
		id: d.id,
		name: d.name,
		tag: d.tag_name,
		assets: d.assets.map((a) => ({
			id: a.id,
			name: a.name,
			browserDownloadUrl: a.browser_download_url,
		})),
	}));
}

function findAssetForSystem(
	assets: Asset[],
	system: BunSystemTuple,
): Asset | null {
	return assets.find((a) => a.name === `bun-${system}.zip`) ?? null;
}

async function fetchAssetBinary(id: string): Promise<Blob> {
	const res = await fetch(
		`https://api.github.com/repos/oven-sh/bun/releases/assets/${id}`,
		{ headers: { Accept: "application/octet-stream" } },
	);
	return res.blob();
}

function hashBlob(blob: Blob): string {
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(blob);
	return hasher.digest("base64");
}

type Sources = {
	versions: Record<Version, SystemSources>;
};
type Version = string;
type SystemSources = Record<NixSystemTuple, Source>;
type Source = {
	url: string;
	hash: string;
};

async function loadSources(): Promise<Sources> {
	const file = Bun.file("sources.json");
	return file.json() as Promise<Sources>;
}

async function saveSources(sources: Sources): Promise<void> {
	const file = Bun.file("sources.json");
	await file.write(JSON.stringify(sources, null, 2));
}

function parseTagVersion(tag: string): Version {
	return tag.replace(/^bun-v/, "");
}

function formatNixHash(hash: string): string {
	return `sha256-${hash}`;
}

const SYSTEMS: BunSystemTuple[] = [
	"darwin-aarch64",
	"darwin-x64",
	"linux-aarch64",
	"linux-x64",
];

const sources = await loadSources();
const releases = await fetchReleases();

for (const release of releases) {
	const version = parseTagVersion(release.tag);
	console.log(`Release '${release.name}' - ID ${release.id}`);

	if (version in sources.versions) {
		console.log("Release already exists in sources.json, skipping");
		continue;
	}
	console.log("Release doesn't exist in sources.json, fetching...");

	const foundAssets: Asset[] = [];
	for (const system of SYSTEMS) {
		const asset = findAssetForSystem(release.assets, system);
		if (!asset)
			throw new Error(
				`Couldn't find asset for version ${release.tag} and system ${system}`,
			);
		foundAssets.push(asset);
	}
	console.table(foundAssets);

	console.log("Fetching asset binaries...");
	const newSources: Source[] = [];
	for (const asset of foundAssets) {
		const blob = await fetchAssetBinary(asset.id);
		console.log(`Got ${asset.name} (${blob.size} bytes)`);
		const hash = hashBlob(blob);
		newSources.push({
			url: asset.browserDownloadUrl,
			hash: formatNixHash(hash),
		});
	}
	console.table(newSources);

	// TODO)) Write results to sources.json
}
