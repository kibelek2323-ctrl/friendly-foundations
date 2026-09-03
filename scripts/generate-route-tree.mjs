/**
 * Regenerates src/routeTree.gen.ts without booting the Vite dev server.
 *
 * The route tree is normally produced as a side effect of the TanStack Start
 * Vite plugin, so if the dev server has not run since a route file was added,
 * the committed tree is stale and new routes never match. This script invokes
 * the same generator directly.
 *
 * Usage: bun run scripts/generate-route-tree.mjs
 */
import process from "node:process";

import { Generator, getConfig } from "@tanstack/router-generator";

const root = process.cwd();

async function main() {
  const config = await getConfig(
    {
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
      target: "react",
    },
    root,
  );

  console.log("resolved generator config:");
  console.log(
    JSON.stringify(
      {
        routesDirectory: config.routesDirectory,
        generatedRouteTree: config.generatedRouteTree,
        routeToken: config.routeToken,
        indexToken: config.indexToken,
        target: config.target,
        autoCodeSplitting: config.autoCodeSplitting,
      },
      null,
      2,
    ),
  );

  const generator = new Generator({ config, root });
  await generator.run();

  console.log("route tree regenerated");
}

main().catch((error) => {
  console.error("route tree generation failed:");
  console.error(error);
  process.exitCode = 1;
});