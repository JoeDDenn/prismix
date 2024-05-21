"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const core_1 = require("@oclif/core");
const prismix_1 = require("./prismix");
const util_1 = require("util");
const jsonfile_1 = __importDefault(require("jsonfile"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const utils_1 = require("./utils");
dotenv_1.default.config();
const readJsonFile = (0, util_1.promisify)(jsonfile_1.default.readFile);
const args = process.argv.slice(2);
class Prismix extends core_1.Command {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log(`Prismix: mixing your schemas... 🍹`);
            let options;
            if (args.includes('--ignore-config')) {
                const modelsPaths = yield (0, utils_1.generateConfig)();
                const mixers = [
                    { input: modelsPaths, output: 'prisma/schema.prisma' }
                ];
                options = { mixers };
            }
            else {
                options = (yield readJsonFile(path_1.default.join(process.cwd(), args[0] || 'prismix.config.json')));
                for (const mixer of options.mixers) {
                    if (!mixer.output)
                        mixer.output = 'prisma/schema.prisma';
                }
            }
            yield (0, prismix_1.prismix)(options);
        });
    }
}
Prismix.description = 'Allows you to have multiple Prisma schema files with shared model relations.';
Prismix.flags = {
    version: core_1.Flags.version({ char: 'v' }),
    help: core_1.Flags.help({ char: 'h' })
};
module.exports = Prismix;
//# sourceMappingURL=index.js.map