
setup:
	yarn --cwd ../v2-core
	yarn --cwd ../v2-core clean
	yarn --cwd ../v2-core compile
	yarn --cwd ../v2-core link
	yarn link @uniswap/v2

all:
	yarn clean
	yarn compile
	yarn test -g WalkThrough
