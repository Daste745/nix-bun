import { compareVersions } from "compare-versions";
import {
	type BunSystemTuple,
	bunToNixSystem,
	type NixSystemTuple,
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
	sha256: string | null;
	browserDownloadUrl: string;
};

function getAuthHeaders(): Record<string, string> {
	const token = process.env.GH_TOKEN;
	return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchReleases(): Promise<Release[]> {
	try {
		const res = await fetch(
			"https://api.github.com/repos/oven-sh/bun/releases",
			{ headers: getAuthHeaders() },
		);
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json.message);
		}

		// biome-ignore lint/suspicious/noExplicitAny: API response
		return json.map((d: any) => ({
			id: d.id,
			name: d.name,
			tag: d.tag_name,
			// biome-ignore lint/suspicious/noExplicitAny: API response
			assets: d.assets.map((a: any) => ({
				id: a.id,
				name: a.name,
				sha256: a.digest,
				browserDownloadUrl: a.browser_download_url,
			})),
		}));
	} catch (error) {
		console.error("Failed to fetch releases:", error);
		throw new Error("Failed to fetch releases");
	}
}

function findAssetForSystem(
	assets: Asset[],
	system: BunSystemTuple,
): Asset | null {
	return assets.find((a) => a.name === `bun-${system}.zip`) ?? null;
}

async function fetchAssetBinary(id: string): Promise<Blob> {
	try {
		const res = await fetch(
			`https://api.github.com/repos/oven-sh/bun/releases/assets/${id}`,
			{ headers: { Accept: "application/octet-stream", ...getAuthHeaders() } },
		);
		return res.blob();
	} catch (error) {
		console.error("Failed to fetch asset:", error);
		throw new Error("Failed to fetch asset");
	}
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

function hexToBase64(hex: string): string {
	return Buffer.from(hex, "hex").toString("base64");
}

function formatSha256Hash(hash: string): string {
	return `sha256-${hash}`;
}

async function getAssetHash(asset: Asset): Promise<string> {
	if (asset.sha256) {
		const [type, hexHash] = asset.sha256.split(":");
		if (type && hexHash) {
			return `${type}-${hexToBase64(hexHash)}`;
		}
	}

	console.log(
		`${asset.name} doesn't have a digest, falling back to manual hashing`,
	);
	const blob = await fetchAssetBinary(asset.id);
	console.log(`Fetched ${asset.name} (${blob.size} bytes)`);
	return formatSha256Hash(hashBlob(blob));
}

const SYSTEMS: BunSystemTuple[] = [
	"darwin-aarch64",
	"darwin-x64",
	"linux-aarch64",
	"linux-x64",
];

async function main() {
	const sources = await loadSources();
	const releases = await fetchReleases();

	console.log(
		`sources.json has ${Object.keys(sources.versions).length} versions`,
	);
	console.log(`Fetched ${releases.length} releases from GitHub`);

	for (const release of releases) {
		const version = parseTagVersion(release.tag);

		if (version in sources.versions) {
			console.log(
				`Release '${release.name}' (ID ${release.id}) already exists in sources.json, skipping`,
			);
			continue;
		}
		console.log(
			`Release '${release.name}' (ID ${release.id}) doesn't exist in sources.json, fetching...`,
		);

		const entries: [NixSystemTuple, Source][] = await Promise.all(
			SYSTEMS.map(async (system) => {
				const asset = findAssetForSystem(release.assets, system);
				if (!asset) {
					throw new Error(
						`Couldn't find asset for version ${release.tag} and system ${system}`,
					);
				}

				return [
					bunToNixSystem(system),
					{
						url: asset.browserDownloadUrl,
						hash: await getAssetHash(asset),
					},
				] as const;
			}),
		);
		const newSources = Object.fromEntries(entries) as SystemSources;

		sources.versions[version] = newSources;
	}

	await saveSources({
		versions: Object.fromEntries(
			Object.entries(sources.versions).sort(([a], [b]) =>
				compareVersions(a, b),
			),
		),
	} as Sources);

	console.log("Saved new sources to sources.json");
}

await main();
