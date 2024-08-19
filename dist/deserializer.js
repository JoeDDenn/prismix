"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserializeModels = deserializeModels;
exports.deserializeDatasources = deserializeDatasources;
exports.deserializeGenerators = deserializeGenerators;
exports.deserializeEnums = deserializeEnums;
const utils_1 = require("./utils");
const renderAttribute = (field) => {
    const { kind, type } = field;
    return {
        default: (value) => {
            console.log(value);
            if (value == null || value === undefined)
                return '';
            if (kind === 'scalar' && type !== 'BigInt' && typeof value == 'string')
                value = `"${value}"`;
            if ((0, utils_1.valueIs)(value, [Number, String, Boolean]) || kind === 'enum') {
                return `@default(${value})`;
            }
            if (typeof value === 'object') {
                if (value.name === 'uuid(4)')
                    return `@default(uuid())`;
                if (value.name === 'dbgenerated')
                    return `@default(${value.name}("${value.args}"))`;
                return `@default(${value.name}(${value.args}))`;
            }
            throw new Error(`Prismix: Unsupported field attribute ${value}`);
        },
        isId: (value) => (value ? '@id' : ''),
        isUnique: (value) => (value ? '@unique' : ''),
        isUpdatedAt: (value) => (value ? '@updatedAt' : ''),
        columnName: (value) => (value ? `@map("${value}")` : ''),
        dbType: (value) => value !== null && value !== void 0 ? value : ''
    };
};
function renderAttributes(field) {
    const { relationFromFields, relationToFields, relationName, kind, relationOnDelete, relationOnUpdate } = field;
    if (kind === 'scalar' || kind === 'enum') {
        return `${Object.keys(field)
            .map((property) => { var _a, _b; return (_b = (_a = renderAttribute(field)) === null || _a === void 0 ? void 0 : _a[property]) === null || _b === void 0 ? void 0 : _b.call(_a, field[property]); })
            .filter((x) => !!x)
            .join(' ')}`;
    }
    if (relationFromFields && kind === 'object') {
        const onDelete = relationOnDelete ? `, onDelete: ${relationOnDelete}` : '';
        const onUpdate = relationOnUpdate ? `, onUpdate: ${relationOnUpdate}` : '';
        return relationFromFields.length > 0
            ? `@relation(name: "${relationName}", fields: [${relationFromFields}], references: [${relationToFields}]${onDelete}${onUpdate})`
            : `@relation(name: "${relationName}")`;
    }
    return '';
}
function renderDocumentation(documentation, tab) {
    if (!documentation)
        return '';
    const documentationLines = documentation.split('\n');
    const tabChar = tab ? '\t' : '';
    const newlineChar = tab ? '\n\t' : '\n';
    return documentationLines.length === 1
        ? `/// ${documentationLines[0]}\n${tabChar}`
        : documentationLines
            .map((text, idx) => (idx === 0 ? `/// ${text}` : `\t/// ${text}`))
            .join('\n') + newlineChar;
}
function renderModelFields(fields) {
    return fields.map((field) => {
        const { name, kind, type, documentation, isRequired, isList } = field;
        let suffix = '';
        const scalarSuffix = isRequired ? '' : '?';
        suffix = isList ? '[]' : scalarSuffix;
        if (kind === 'scalar' || kind === 'object' || kind === 'enum') {
            return `${renderDocumentation(documentation, true)}${name} ${type}${suffix} ${renderAttributes(field)}`;
        }
        throw new Error(`Prismix: Unsupported field kind "${kind}"`);
    });
}
function renderIdFieldsOrPrimaryKey(idFields) {
    if (!idFields)
        return '';
    return idFields.length > 0 ? `@@id([${idFields.join(', ')}])` : '';
}
function renderUniqueIndexes(uniqueIndexes) {
    return uniqueIndexes.length > 0
        ? uniqueIndexes.map(({ name, fields }) => `@@unique([${fields.join(', ')}]${name ? ', name: ' + name : ''})`)
        : [];
}
function renderDbName(dbName) {
    return dbName ? `@@map("${dbName}")` : '';
}
function renderUrl(envValue) {
    const value = envValue.fromEnvVar ? `env("${envValue.fromEnvVar}")` : `"${envValue.value}"`;
    return `url = ${value}`;
}
function renderProvider(provider) {
    return `provider = "${provider}"`;
}
function renderOutput(path) {
    return path ? `output = "${path}"` : '';
}
function renderEnumFileName(path) {
    return path ? `enumFileName = "${path}"` : '';
}
function renderFileName(path) {
    return path ? `fileName = "${path}"` : '';
}
function renderBinaryTargets(binaryTargets) {
    return (binaryTargets === null || binaryTargets === void 0 ? void 0 : binaryTargets.length) ? `binaryTargets = ${JSON.stringify(binaryTargets)}` : '';
}
function renderPreviewFeatures(previewFeatures) {
    return previewFeatures.length ? `previewFeatures = ${JSON.stringify(previewFeatures)}` : '';
}
function renderBlock(type, name, things, documentation) {
    return `${renderDocumentation(documentation)}${type} ${name} {\n${things
        .filter((thing) => thing.length > 1)
        .map((thing) => `\t${thing}`)
        .join('\n')}\n}`;
}
function deserializeModel(model) {
    var _a;
    const { name, fields, dbName, primaryKey, uniqueIndexes, documentation } = model;
    return renderBlock('model', name, [
        ...renderModelFields(fields),
        ...renderUniqueIndexes(uniqueIndexes),
        renderDbName(dbName),
        renderIdFieldsOrPrimaryKey((_a = primaryKey === null || primaryKey === void 0 ? void 0 : primaryKey.fields) !== null && _a !== void 0 ? _a : [])
    ], documentation);
}
function deserializeDatasource(datasource) {
    const { activeProvider: provider, name, url } = datasource;
    return renderBlock('datasource', name, [renderProvider(provider), renderUrl(url)]);
}
function deserializeGenerator(generator) {
    var _a, _b, _c, _d;
    const { name, output, provider, previewFeatures, config } = generator;
    return renderBlock('generator', name, [
        renderProvider((_a = provider.value) !== null && _a !== void 0 ? _a : ''),
        renderOutput((_b = output === null || output === void 0 ? void 0 : output.value) !== null && _b !== void 0 ? _b : null),
        renderEnumFileName((_c = config === null || config === void 0 ? void 0 : config.enumFileName) !== null && _c !== void 0 ? _c : null),
        renderFileName((_d = config === null || config === void 0 ? void 0 : config.fileName) !== null && _d !== void 0 ? _d : null),
        renderPreviewFeatures(previewFeatures)
    ]);
}
function deserializeEnum({ name, values, dbName, documentation }) {
    const outputValues = values.map(({ name, dbName }) => {
        let result = name;
        if (name !== dbName && dbName)
            result += `@map("${dbName}")`;
        return result;
    });
    return renderBlock('enum', name, [...outputValues, renderDbName(dbName !== null && dbName !== void 0 ? dbName : null)], documentation);
}
async function deserializeModels(models) {
    return models.map((model) => deserializeModel(model)).join('\n');
}
async function deserializeDatasources(datasources) {
    return datasources.map((datasource) => deserializeDatasource(datasource)).join('\n');
}
async function deserializeGenerators(generators) {
    return generators.map((generator) => deserializeGenerator(generator)).join('\n');
}
async function deserializeEnums(enums) {
    const enumNames = [];
    return enums
        .map((each) => {
        if (enumNames.includes(each.name)) {
            console.log(`Enum *${each.name}* already defined before i will accept first definition only recheck your schema`);
            return '';
        }
        enumNames.push(each.name);
        return deserializeEnum(each);
    })
        .join('\n');
}
//# sourceMappingURL=deserializer.js.map