import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {runtimeAssetPlugin} from './scripts/runtime-assets.mjs';
import {assetVersionPlugin} from './scripts/asset-versions.mjs';
const project=fileURLToPath(new URL('.',import.meta.url));
const versionedAssets=assetVersionPlugin(project);
export default defineConfig({base:'./',plugins:[versionedAssets,runtimeAssetPlugin(project,{afterApply:versionedAssets.api.verifyBuilt})],build:{sourcemap:false}});
