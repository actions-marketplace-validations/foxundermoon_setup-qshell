// Load tempDirectory before it gets wiped by tool-cache
import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import * as os from 'os';
import * as path from 'path';
// import {promises as fse} from 'fs';

let tempDirectory = process.env['RUNNER_TEMPDIRECTORY'] || '';

if (!tempDirectory) {
  let baseLocation;
  if (process.platform === 'win32') {
    // On windows use the USERPROFILE env variable
    baseLocation = process.env['USERPROFILE'] || 'C:\\';
  } else {
    if (process.platform === 'darwin') {
      baseLocation = '/Users';
    } else {
      baseLocation = '/home';
    }
  }
  tempDirectory = path.join(baseLocation, 'actions', 'temp');
}

export async function getQshell(version: string) {
  // check cache
  let toolPath: string = tc.find('qshell', version);

  // If not found in cache, download
  if (!toolPath) {
    // download, extract, cache
    toolPath = await acquireQshell(version);
  }

  console.log(`toolPath: ${toolPath}`);

  //
  // a tool installer initimately knows details about the layout of that tool
  // for example, node binary is in the bin folder after the extract on Mac/Linux.
  // layouts could change by version, by platform etc... but that's the tool installers job
  //
  // if (osPlat != 'win32') {
  //   toolPath = path.join(toolPath, 'bin');
  // }

  //
  // prepend the tools path. instructs the agent to prepend for future tasks
  core.addPath(toolPath);
}

async function acquireQshell(version: string): Promise<string> {
  //
  // Download - a tool installer intimately knows how to get the tool (and construct urls)

  // https://github.com/qiniu/qshell/releases/download/v2.6.2/qshell-v2.6.2-darwin-amd64.tar.gz
  // https://github.com/qiniu/qshell/releases/download/v2.6.2/qshell-v2.6.2-linux-386.tar.gz

  let arch;

  switch (os.arch()) {
    case 'x64':
      arch = 'amd64';
      break;
    case 'x32':
      arch = '386';
      break;

    default:
      arch = os.arch();
      break;
  }

  const platform = os.platform() === 'win32' ? 'windows' : os.platform();

  const fileName = `qshell-v${version}-${platform}-${arch}.tar.gz`;

  const extFileName = `qshell${platform === 'win32' ? '.exe' : ''}`;

  const downloadUrl = `https://github.com/qiniu/qshell/releases/download/v${version}/${fileName}`;

  const downloadPath: string = await tc.downloadTool(downloadUrl);

  // console.log(`downloadPath: ${downloadPath}`);

  //
  // Extract
  //
  // let zipPath = path.join(downloadPath, urlFileName);

  // console.log(`zipPath: ${zipPath}`);
  // const items = await fse.readdir(downloadPath);

  // console.log(`downloadPath files: ${items.join('\n')}`);
  const extPath: string = await tc.extractTar(downloadPath, undefined, 'zxvf');

  // console.log(`extPath: ${extPath}`);
  //
  // cache qshell
  //
  const oldPath = path.join(extPath, extFileName);
  // console.log(`oldPath: ${oldPath}`);
  // let newPath = path.join(extPath, `qshell${osPlat == 'win32' ? '.exe' : ''}`);
  // await fse.rename(oldPath, newPath);

  // const unzipFiles = await fse.readdir(extPath);

  // console.log(`unzipFiles: ${unzipFiles.join('\n')}`);
  const cacheRst = await tc.cacheFile(
    oldPath,
    `qshell${arch === 'win32' ? '.exe' : ''}`,
    'qshell',
    version
  );
  // console.log(`cacheRst: ${cacheRst}`);
  return cacheRst;
}
