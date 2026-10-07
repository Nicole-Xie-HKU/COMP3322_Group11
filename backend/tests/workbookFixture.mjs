import JSZip from 'jszip';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

/** Change headers only in a temporary copy; never edit the supplied workbook. */
export async function workbookWithHeader(t,header,replacement) {
  const folder=await mkdtemp(join(tmpdir(),'hkuplan-header-'));
  t.after(()=>rm(folder,{recursive:true,force:true}));
  const zip=await JSZip.loadAsync(await readFile(new URL('../../Database/2026-27 class_timetable_20260902.xlsx',import.meta.url)));
  const name='xl/sharedStrings.xml',xml=await zip.file(name).async('string');
  if(!xml.includes(`${header}</t>`))throw new Error(`Fixture header not found: ${header}`);
  zip.file(name,xml.replace(`${header}</t>`,`${replacement}</t>`));
  const file=join(folder,'invalid.xlsx');
  await writeFile(file,await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
  return file;
}
