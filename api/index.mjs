// Vercel Function entry for the NestJS API (ADR 0019).
//
// The webpack bundle loads its external packages through `createRequire(import.meta.url)`,
// and Nest loads some packages by name at runtime (`loadPackage`). Vercel's file tracer
// follows neither, so every runtime package is imported here statically: the tracer then
// copies each package and its dependency tree into the function (issue #11).
// `apps/api/src/vercel-entry.spec.ts` fails if the bundle needs a package missing here.
import '@nestjs/common';
import '@nestjs/core';
import '@nestjs/platform-express';
import '@nestjs/swagger';
import 'class-transformer';
import 'class-validator';
import 'helmet';
import 'reflect-metadata';
import 'swagger-ui-dist';
import 'tslib';

export { default } from '../dist/apps/api/vercel-handler.mjs';
