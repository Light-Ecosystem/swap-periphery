
setup:
	yarn --cwd ../swap-core
	yarn --cwd ../swap-core clean
	yarn --cwd ../swap-core compile
	yarn --cwd ../swap-core flatten
	yarn --cwd ../swap-core link
	yarn install
	yarn link @uniswap/v2-core
	cp .env.ts.example .env.ts

all:
	yarn clean
	yarn compile
	yarn flatten
	yarn test -g WalkThrough
	yarn deploy
	yarn verify
