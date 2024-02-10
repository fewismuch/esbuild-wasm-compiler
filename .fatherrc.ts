import {IFatherConfig} from "father/dist/types";

const config: IFatherConfig = {
  esm: {
    input: 'src',
    platform: 'browser',
    transformer: 'babel',
    output: 'dist/esm'
  },
  umd: {
    entry: 'src/index',
    output: 'dist'
  },
}

export default config;
