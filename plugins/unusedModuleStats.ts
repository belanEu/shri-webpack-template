import { Compilation, Compiler } from "webpack";
import { readdirSync, writeFileSync, lstatSync } from 'fs';
import { resolve } from "path";

type ModulePaths = {
    [path: string]: true
};

type Options = {
    pathToModules: string,
    pathToResultFile: string
};

const defaultOptions = {
    pathToModules: resolve(__dirname, '../src'),
    pathToResultFile: resolve(__dirname, '../unused')
};

class UnusedModuleStatsPlugin {
    private pluginName: string;
    private usedModules: ModulePaths;
    private allModules: ModulePaths;

    private options: Options;

    constructor(options = defaultOptions) {
        this.pluginName = UnusedModuleStatsPlugin.name;
        this.options = options;

        this.usedModules = {};
        this.allModules = {};
    }

    apply(compiler: Compiler) {
        compiler.hooks.thisCompilation.tap(this.pluginName, compilation => this.gatherUsedModules(compilation));
        compiler.hooks.done.tap(this.pluginName, () => this.gatherUnusedModulesIntoFile());
    }

    gatherUsedModules(compilation: Compilation) {
        // @ts-ignore
        compilation.hooks.succeedModule.tap(this.pluginName, ({resource}) => {
            if (!resource.includes('/node_modules/')) {
                this.usedModules[resource] = true;
            }
        });
    }

    gatherAllModules() {
        this.allModules = this.walkInto(this.options.pathToModules);
    }

    walkInto(pathToFile: string) {
        let modules: ModulePaths = {};
        
        for (let currPath of readdirSync(pathToFile)) {
            let tmp = resolve(pathToFile, currPath);
            
            if (lstatSync(tmp).isDirectory()) {
                const foundModules = Object.keys(this.walkInto(tmp));
                if (foundModules.length > 0) {
                    foundModules.forEach(modulePath => {
                        if (modules[modulePath] === undefined) {
                            modules[modulePath] = true;
                        }
                    });
                }
            } else if (lstatSync(tmp).isFile() && /([a-zA-Z]+|[0-9]+)\.(js|jsx|ts|tsx)$/.test(tmp)) {
                modules[tmp] = true;
            }
        }

        return modules;
    }

    gatherUnusedModulesIntoFile() {
        writeFileSync(
            this.options.pathToResultFile,
            JSON.stringify(this.extractUnusedModulesToArray())
        );
    }

    extractUnusedModulesToArray() {
        this.gatherAllModules();

        Object.keys(this.usedModules).forEach(path => {
            if (this.allModules[path] === true) {
                delete this.allModules[path];
            }
        });

        return Object.keys(this.allModules);
    }
}

export default UnusedModuleStatsPlugin;