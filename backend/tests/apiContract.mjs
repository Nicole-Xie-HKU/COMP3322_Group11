import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
const spec=await SwaggerParser.dereference(fileURLToPath(new URL('../docs/openapi.json',import.meta.url)));
const ajv=new Ajv({strict:false,validateFormats:false,allErrors:true});
const validators=new Map();
/** Check the documented JSON response for an actual HTTP result, including error status codes. */
export function assertApiResponse(method,path,response) {
  const key=`${method}:${path}:${response.status}`;
  if(!validators.has(key)) {
    const schema=spec.paths[path]?.[method]?.responses[response.status]?.content['application/json'].schema;
    assert.ok(schema,`Missing OpenAPI response for ${key}`);validators.set(key,ajv.compile(schema));
  }
  const validate=validators.get(key);
  assert.ok(validate(response.body),`${key}: ${JSON.stringify(validate.errors)}`);
  return response.body;
}
