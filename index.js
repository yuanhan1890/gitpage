#!/usr/bin/env node
const git = require('simple-git/promise')(process.cwd())

if (!git.checkIsRepo()) {
  console.error('不在git仓库')
  return
}
// 命令
// 语境：某分支，默认为master分支
// 1. 前翻
// 2. 后翻
// 3. 到最后一页，到最新一页

const ACTIONS = {
  older: 0,
  newer: 1,
  oldest: 2,
  latest: 3
}

async function page(action) {
  if (action === ACTIONS.latest) {
    await git.checkout('master')
    return
  }

  const { all } = await git.log()

  // 获取当前commit id
  const currentCommit = all[0]

  // checkout到mater分支
  await git.checkout('master')
  const { all: branchCommits } = await git.log()

  if (action === ACTIONS.oldest) {
    const lastCommit = branchCommits[branchCommits.length - 1]
    await git.checkout(lastCommit.hash)
    return
  }

  const commitIndex = branchCommits.findIndex(({ hash }) => {
    return hash === currentCommit.hash
  })

  if (commitIndex === 0 && action === ACTIONS.newer) {
    console.log('已经在第一页')
    return
  }
  if (commitIndex === branchCommits.length - 1 && action === ACTIONS.older) {
    console.log('已经在最后一页')
    return
  }

  let page = action === ACTIONS.newer ? commitIndex - 1 : (
    action === ACTIONS.older ? commitIndex + 1 : undefined
  )

  if (!page) {
    console.error('未知命令')
    return
  }

  await git.checkout(branchCommits[page].hash)
}

const { _: args } = require('yargs').argv

const action = {
  'l': 'newer',
  'r': 'older',
  '.':'oldest',
  '--': 'latest',
}[args[0]]

if (action) {
  page(action)
} else {
  console.log('未知命令')
}
