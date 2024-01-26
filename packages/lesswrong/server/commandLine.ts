import { CommandLineArguments, isAnyTest, isMigrations } from '../lib/executionEnvironment';
import process from 'process';
import fs from 'fs';


const parseCommandLine = (argv: Array<string>): CommandLineArguments => {
  const commandLine: CommandLineArguments = {
    postgresUrl: process.env.PG_URL || "",
    postgresReadUrl: process.env.PG_READ_URL || "",
    settingsFileName: "settings.json",
    generateTypes: false,
    shellMode: false,
  }
  
  // Don't parse command-line arguments during unit testing (because jest passes
  // its command line arguments through).
  if (isAnyTest)
    return commandLine;
  
  for (let i=2; i<argv.length; i++) {
    const arg = argv[i];
    switch(arg) {
      case "-h":
      case "-help":
      case "--help":
        printHelpText();
        process.exit(0);
        break;
      case "--settings":
        commandLine.settingsFileName = argv[++i];
        break;
      case "--generateTypes":
        commandLine.generateTypes = true;
        break;
      case "--shell":
        commandLine.shellMode = true;
        break;
      case "--command":
        commandLine.command = argv[++i];
        break;
      default:
        if (!isMigrations) {
          throw new Error(`Unrecognized command line argument: ${arg}`);
        }
    }
  }
  
  return commandLine;
}

// eslint-disable-next-line no-console
const printHelpText = () => console.log(`ForumMagnum
Usage: ${process.argv[0]} ${process.argv[1]} --settings [settings-file.json] [--generate-types]
  --settings        Load instance settings from the indicated file
  --generate-types  Updated generated type definitions (instead of running a server)
`)

export const getCommandLineArguments = () => {
  return parseCommandLine(process.argv);
}

export const loadInstanceSettings = (args?: CommandLineArguments) => {
  const commandLineArguments = args ?? parseCommandLine(process.argv);
  const instanceSettings = loadSettingsFile(commandLineArguments.settingsFileName);
  return instanceSettings;
}

function loadSettingsFile(filename: string) {
  if (isAnyTest) {
    filename = "./settings-test.json";
  }
  const settingsFileText = readTextFile(filename);
  if (!settingsFileText)
    throw new Error(`Settings file ${filename} not found.`);
  return JSON.parse(settingsFileText);
}

const readTextFile = (filename: string): string|null => {
  return fs.readFileSync(filename, 'utf8');
}
