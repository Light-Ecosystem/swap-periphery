
setup:
	yarn --cwd ../v2-core
	yarn --cwd ../v2-core clean
	yarn --cwd ../v2-core compile
	yarn --cwd ../v2-core flatten
	yarn --cwd ../v2-core link
	yarn link @uniswap/v2-core
	cp .env.ts.example .env.ts

all:
	yarn clean
	yarn compile
	yarn flatten
	yarn test -g WalkThrough
	yarn deploy
	yarn verify
