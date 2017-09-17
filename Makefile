

lint:
	@echo "--> Running linters"
	@./node_modules/.bin/eslint libri/author/**
	@./node_modules/.bin/eslint libri/common/**
	@npm run flow status

fix:
	@echo "--> Running eslint with fix"
	@./node_modules/.bin/eslint --fix libri/author/**
	@./node_modules/.bin/eslint --fix libri/common/**

proto:
	@echo "--> Running protoc"
	@pushd libri && protoc ./librarian/api/*.proto --js_out=import_style=commonjs,binary:. && popd

test:
	@echo "--> Running npm test"
	@npm test