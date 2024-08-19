"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismix = prismix;
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const internals_1 = require("@prisma/internals");
const deserializer_1 = require("./deserializer");
const glob_1 = require("glob");
const utils_1 = require("./utils");
const readFile = (0, util_1.promisify)(fs_1.default.readFile);
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
async function getSchema(schemaPath) {
    try {
        const schema = await readFile(path_1.default.join(process.cwd(), schemaPath), {
            encoding: 'utf-8'
        });
        const dmmf = await (0, internals_1.getDMMF)({ datamodel: schema });
        const customAttributes = getCustomAttributes(schema);
        const models = dmmf.datamodel.models.map((model) => {
            var _a;
            return ({
                ...model,
                doubleAtIndexes: (_a = customAttributes[model.name]) === null || _a === void 0 ? void 0 : _a.doubleAtIndexes,
                fields: model.fields.map((field) => {
                    var _a, _b;
                    const attributes = (_b = (_a = customAttributes[model.name]) === null || _a === void 0 ? void 0 : _a.fields[field.name]) !== null && _b !== void 0 ? _b : {};
                    return {
                        ...field,
                        columnName: attributes.columnName,
                        dbType: attributes.dbType,
                        relationOnUpdate: attributes.relationOnUpdate
                    };
                })
            });
        });
        const config = await (0, internals_1.getConfig)({ datamodel: schema });
        return {
            models,
            enums: dmmf.datamodel.enums,
            datasources: config.datasources,
            generators: config.generators
        };
    }
    catch (e) {
        console.error(`Prismix failed to parse schema located at "${schemaPath}". Did you attempt to reference to a model without creating an alias? Remember you must define a "blank" alias model with only the "@id" field in your extended schemas otherwise we can't parse your schema.`, e);
    }
}
function mixModels(inputModels) {
    var _a, _b, _c, _d, _e, _f;
    const models = {};
    for (const newModel of inputModels) {
        const existingModel = models[newModel.name];
        if (existingModel) {
            const existingFieldNames = existingModel.fields.map((f) => f.name);
            for (const newField of newModel.fields) {
                const mutableField = newField;
                if (existingFieldNames.includes(mutableField.name)) {
                    const existingFieldIndex = existingFieldNames.indexOf(mutableField.name);
                    const existingField = existingModel.fields[existingFieldIndex];
                    if (!mutableField.columnName && existingField.columnName) {
                        mutableField.columnName = existingField.columnName;
                    }
                    if (!mutableField.hasDefaultValue && existingField.hasDefaultValue) {
                        if (!mutableField.default) {
                            mutableField.hasDefaultValue = true;
                            mutableField.default = existingField.default;
                        }
                    }
                    existingModel.fields[existingFieldIndex] = mutableField;
                }
                else {
                    existingModel.fields.push(mutableField);
                }
            }
            if (!existingModel.dbName && newModel.dbName) {
                existingModel.dbName = newModel.dbName;
            }
            if ((_a = newModel.doubleAtIndexes) === null || _a === void 0 ? void 0 : _a.length) {
                existingModel.doubleAtIndexes = [
                    ...((_b = existingModel.doubleAtIndexes) !== null && _b !== void 0 ? _b : []),
                    ...newModel.doubleAtIndexes
                ];
            }
            if ((_c = newModel.uniqueIndexes) === null || _c === void 0 ? void 0 : _c.length) {
                for (const index of newModel.uniqueIndexes) {
                    if ((0, utils_1.containsObject)(index, (_d = existingModel.uniqueIndexes) !== null && _d !== void 0 ? _d : [])) {
                        console.log('adding index', index);
                        existingModel.uniqueIndexes = [...((_e = existingModel.uniqueIndexes) !== null && _e !== void 0 ? _e : []), index];
                    }
                }
                existingModel.uniqueFields = [
                    ...((_f = existingModel.uniqueFields) !== null && _f !== void 0 ? _f : []),
                    ...newModel.uniqueFields
                ];
            }
        }
        else {
            models[newModel.name] = newModel;
        }
    }
    return Object.values(models);
}
function getCustomAttributes(datamodel) {
    const modelChunks = datamodel.split('\n}');
    return modelChunks.reduce((modelDefinitions, modelChunk) => {
        var _a;
        let pieces = modelChunk.split('\n').filter((chunk) => chunk.trim().length);
        const modelName = (_a = pieces.find((name) => name.match(/model (.*) {/))) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (!modelName)
            return modelDefinitions;
        const mapRegex = new RegExp(/[^@]@map\("(?<name>.*)"\)/);
        const dbRegex = new RegExp(/@db\.(?<type>[^\s()]+(?:\([^)]+\))?)/g);
        const relationOnUpdateRegex = new RegExp(/onUpdate: (?<op>Cascade|NoAction|Restrict|SetDefault|SetNull)/);
        const doubleAtIndexRegex = new RegExp(/(?<index>@@index\(.*\))/);
        const doubleAtIndexes = pieces
            .reduce((ac, field) => {
            var _a;
            const match = doubleAtIndexRegex.exec(field);
            const item = (_a = match === null || match === void 0 ? void 0 : match.groups) === null || _a === void 0 ? void 0 : _a.index;
            return item ? [...ac, item] : ac;
        }, [])
            .filter((f) => f);
        const fieldsWithCustomAttributes = pieces
            .map((field) => {
            var _a, _b, _c;
            const mapMatch = mapRegex.exec(field);
            const columnName = (_a = mapMatch === null || mapMatch === void 0 ? void 0 : mapMatch.groups) === null || _a === void 0 ? void 0 : _a.name;
            const dbType = (_b = dbRegex.exec(field)) === null || _b === void 0 ? void 0 : _b[0];
            const relationOnUpdateMatch = relationOnUpdateRegex.exec(field);
            const relationOnUpdate = (_c = relationOnUpdateMatch === null || relationOnUpdateMatch === void 0 ? void 0 : relationOnUpdateMatch.groups) === null || _c === void 0 ? void 0 : _c.op;
            return [field.trim().split(' ')[0], { columnName, dbType, relationOnUpdate }];
        })
            .filter((f) => { var _a, _b, _c; return ((_a = f[1]) === null || _a === void 0 ? void 0 : _a.columnName) || ((_b = f[1]) === null || _b === void 0 ? void 0 : _b.dbType) || ((_c = f[1]) === null || _c === void 0 ? void 0 : _c.relationOnUpdate); });
        return {
            ...modelDefinitions,
            [modelName]: { fields: Object.fromEntries(fieldsWithCustomAttributes), doubleAtIndexes }
        };
    }, {});
}
async function prismix(options) {
    for (const mixer of options.mixers) {
        const schemasToMix = [];
        for (const input of mixer.input) {
            for (const file of (0, glob_1.globSync)(input)) {
                const parsedSchema = await getSchema(file);
                if (parsedSchema)
                    schemasToMix.push(parsedSchema);
            }
        }
        let models = [];
        for (const schema of schemasToMix)
            models = [...models, ...schema.models];
        models = mixModels(models);
        let enums = [];
        schemasToMix.forEach((schema) => !!schema.enums && (enums = [...enums, ...schema.enums]));
        let datasources = [];
        schemasToMix.forEach((schema) => schema.datasources.length > 0 &&
            schema.datasources.filter((d) => d.url.value).length > 0 &&
            (datasources = schema.datasources));
        let generators = [];
        schemasToMix.forEach((schema) => schema.generators.length > 0 && (generators = schema.generators));
        let outputSchema = [
            '// *** GENERATED BY PRISMIX [[JoeDDenn fork]]:: DO NOT EDIT ***',
            await (0, deserializer_1.deserializeDatasources)(datasources),
            await (0, deserializer_1.deserializeGenerators)(generators),
            await (0, deserializer_1.deserializeModels)(models),
            await (0, deserializer_1.deserializeEnums)(enums)
        ]
            .filter((e) => e)
            .join('\n');
        await writeFile(path_1.default.join(process.cwd(), mixer.output), outputSchema);
    }
}
//# sourceMappingURL=prismix.js.map