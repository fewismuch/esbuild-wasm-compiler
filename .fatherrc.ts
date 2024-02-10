import {IFatherConfig} from "father/dist/types";

const config: IFatherConfig = {
  esm: {
    input: 'src',
    platform: 'browser',
    transformer: 'babel',
  },
  umd: {
    entry: 'src/index',
  },
}

export default config;
