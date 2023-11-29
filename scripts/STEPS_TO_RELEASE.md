1. `yarn install`
2. Bump version in `package.json` to new version number
3. `yarn build` compiles + type checks
4. `yarn pkg` creates a "release" folder w/ the contents of the npm package
5. `./pub.sh` publishes to npm registry. Note! This isn't a `yarn` command like the others because npm doesn't think you're logged in when running from the yarn script runner.
6. `yarn docker` creates a Docker image + publishes to the Docker registry
