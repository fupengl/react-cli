import fs from 'node:fs'
import path from 'node:path'

import { chalk } from '@planjs/react-cli-shared-utils'
import fileSize from 'filesize'
import recursive from 'recursive-readdir'
import stripAnsi from 'strip-ansi'
import { gzipSizeSync } from 'gzip-size'
import type { MultiStats, Stats, StatsAsset } from 'webpack'

function canReadAsset(asset: string) {
  return (
    /\.(js|css)$/.test(asset) &&
    !/service-worker\.js/.test(asset) &&
    !/precache-manifest\.[0-9a-f]+\.js/.test(asset)
  )
}

// Prints a detailed summary of build files.
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function printFileSizesAfterBuild(
  webpackStats: Stats | MultiStats,
  previousSizeMap: {
    sizes: Record<string, number>
    root: string
  },
  buildFolder: string,
  maxBundleGzipSize: number,
  maxChunkGzipSize: number
) {
  const root = previousSizeMap.root
  const sizes = previousSizeMap.sizes
  const assets = ((webpackStats as MultiStats).stats || [webpackStats])
    .map((stats: Stats) =>
      stats
        .toJson({ all: false, assets: true })
        .assets!.filter((asset: StatsAsset) => canReadAsset(asset.name))
        .map((asset: StatsAsset) => {
          const fileContents = fs.readFileSync(path.join(root, asset.name))
          const size = gzipSizeSync(fileContents)
          const previousSize = sizes[removeFileNameHash(root, asset.name)]
          const difference = getDifferenceLabel(size, previousSize)
          return {
            folder: path.join(
              path.basename(buildFolder),
              path.dirname(asset.name)
            ),
            name: path.basename(asset.name),
            size: size,
            sizeLabel:
              fileSize(size) + (difference ? ' (' + difference + ')' : ''),
            chunkNames: asset.chunkNames!
          }
        })
    )
    .flat()
  assets.sort((a, b) => b.size - a.size)
  const longestSizeLabelLength = Math.max.apply(
    null,
    assets.map((a) => stripAnsi(a.sizeLabel).length)
  )
  let suggestBundleSplitting = false
  assets.forEach((asset) => {
    let sizeLabel = asset.sizeLabel
    const sizeLength = stripAnsi(sizeLabel).length
    if (sizeLength < longestSizeLabelLength) {
      const rightPadding = ' '.repeat(longestSizeLabelLength - sizeLength)
      sizeLabel += rightPadding
    }
    const isMainBundle = !!asset.chunkNames?.length
    const maxRecommendedSize = isMainBundle
      ? maxBundleGzipSize
      : maxChunkGzipSize
    const isLarge = maxRecommendedSize && asset.size > maxRecommendedSize
    if (isLarge && path.extname(asset.name) === '.js') {
      suggestBundleSplitting = true
    }
    console.log(
      '  ' +
        (isLarge ? chalk.yellow(sizeLabel) : sizeLabel) +
        '  ' +
        chalk.dim(asset.folder + path.sep) +
        chalk.cyan(asset.name)
    )
  })
  if (suggestBundleSplitting) {
    console.log()
    console.log(
      chalk.yellow('The bundle size is significantly larger than recommended.')
    )
    console.log(
      chalk.yellow(
        'Consider reducing it with code splitting: https://create-react-app.dev/docs/code-splitting/'
      )
    )
    console.log(
      chalk.yellow(
        'You can also analyze the project dependencies: https://goo.gl/LeUzfb'
      )
    )
  }
}

function removeFileNameHash(buildFolder: string, fileName: string): string {
  return fileName
    .replace(buildFolder, '')
    .replace(/\\/g, '/')
    .replace(
      /\/?(.*)(\.[0-9a-f]+)(\.chunk)?(\.js|\.css)/,
      (match, p1, p2, p3, p4) => p1 + p4
    )
}

// Input: 1024, 2048
// Output: "(+1 KB)"
function getDifferenceLabel(currentSize: number, previousSize: number) {
  const FIFTY_KILOBYTES = 1024 * 50
  const difference = currentSize - previousSize
  const _fileSize = !Number.isNaN(difference) ? fileSize(difference) : 0
  if (difference >= FIFTY_KILOBYTES) {
    return chalk.red('+' + _fileSize)
  } else if (difference < FIFTY_KILOBYTES && difference > 0) {
    return chalk.yellow('+' + _fileSize)
  } else if (difference < 0) {
    return chalk.green(_fileSize)
  } else {
    return ''
  }
}

export function measureFileSizesBeforeBuild(buildFolder: string): Promise<{
  sizes: Record<string, number>
  root: string
}> {
  return new Promise((resolve) => {
    recursive(buildFolder, (err, fileNames) => {
      let sizes
      if (!err && fileNames) {
        sizes = fileNames
          .filter(canReadAsset)
          .reduce<Record<string, number>>((memo, fileName) => {
            const contents = fs.readFileSync(fileName)
            const key = removeFileNameHash(buildFolder, fileName)
            memo[key] = gzipSizeSync(contents)
            return memo
          }, {})
      }
      resolve({
        root: buildFolder,
        sizes: sizes || {}
      })
    })
  })
}
