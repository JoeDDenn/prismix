"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.valueIs = valueIs;
exports.containsObject = containsObject;
exports.generateConfig = generateConfig;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const PRISMA_EXTENSION = '.prisma';
const EXCLUDED_PRISMA_FILE = 'schema.prisma';
const IGNORED_PRISMA_SUFFIX = '.i.prisma';
function valueIs(value, types) {
    return types.map((type) => type.name.toLowerCase() == typeof value).includes(true);
}
function containsObject(obj, list) {
    const keysToCheck = Object.keys(obj);
    const isObjectInArray = list.some((item) => keysToCheck.every((key) => item[key] === obj[key]));
    return isObjectInArray;
}
async function generateConfig(dir = process.cwd()) {
    const filesFound = new Set();
    const projectDir = process.cwd();
    filesFound.add('prisma/base.prisma');
    filesFound.add('prisma/enums/enums.prisma');
    async function scanDirectory(currentDir) {
        try {
            const files = await fs_1.promises.readdir(currentDir, { withFileTypes: true });
            const tasks = files.map(async (file) => {
                const absoluteFilePath = path_1.default.join(currentDir, file.name);
                const relativeFilePath = path_1.default
                    .relative(projectDir, absoluteFilePath)
                    .replaceAll(path_1.default.sep, '/');
                if (file.isDirectory()) {
                    await scanDirectory(absoluteFilePath);
                }
                else if (file.isFile() && isValidPrismaFile(file.name)) {
                    filesFound.add(relativeFilePath);
                }
            });
            await Promise.all(tasks);
        }
        catch (err) {
            console.error(`Error reading directory ${currentDir}: ${err}`);
        }
    }
    function isValidPrismaFile(fileName) {
        return (fileName.endsWith(PRISMA_EXTENSION) &&
            fileName !== EXCLUDED_PRISMA_FILE &&
            !fileName.endsWith(IGNORED_PRISMA_SUFFIX));
    }
    await scanDirectory(dir);
    return Array.from(filesFound);
}
//# sourceMappingURL=utils.js.map