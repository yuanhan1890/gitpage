#!/usr/bin/env node
const repoPath = process.cwd()
const repoGit = `${repoPath.replace(/(\/|\\)$/, '')}/.git`
const git = require('simple-git/promise')(repoPath)
const getCommitStream = require('./stream')

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

async function page(action, branch = "master") {
  if (action === ACTIONS.latest) {
    await git.checkout(branch)
    return
  }

  const currentCommit = await getCommitStream({
    path: repoGit,
    args: ['-1'],
    onCommits(commitHashs, done) {
      done(commitHashs[0])
    }
  })

  const currentCommitDate = await git.show(['-s', '--format=%cd', currentCommit])

  // checkout到mater分支
  await git.checkout(branch)

  if (action === ACTIONS.oldest) {
    const lastCommit = await getCommitStream({
      path: repoGit,
      args: ['--reverse'],
      onCommits(commitHashs, done) {
        done(commitHashs[0])
      }
    })
    await git.checkout(lastCommit)
    return
  }

  let fn = null
  if (action === ACTIONS.older) {
    const commit = await getCommitStream({
      path: repoGit,
      args: [currentCommit, '--skip', '1'],
      onCommits(commitHashs, done) {
        done(commitHashs[0])
      }
    })

    if (commit === currentCommit || !commit) {
      console.log('已经在最后一页')
    }

    if (commit) {
      await git.checkout(commit)
    } else {
      await git.checkout(currentCommit)
    }
    return
  } else if (action === ACTIONS.newer) {
    let finded = false
    const commit = await getCommitStream({
      path: repoGit,
      args: ['--date', 'local', '--since', currentCommitDate, '--reverse', '--skip', '1'],
      onCommits(commitHashs, done) {
        if (finded) {
          done(commitHashs[0])
          return
        }

        for (let i = 0; i < commitHashs.length; i += 1) {
          if (currentCommit !== commitHashs[i]) {
            continue
          }

          if (i === commitHashs.length - 1) {
            finded = true
            return
          }

          done(commitHashs[i + 1])
        }
      }
    })

    if (commit === currentCommit) {
      console.log('已经在第一页')
    }

    if (commit) {
      await git.checkout(commit)
    } else {
      await git.checkout(currentCommit)
    }
    return
  }

  console.error('未知命令');
  return
}

const { _: args, branch } = require('yargs').argv

const action = {
  'l': 'newer',
  'r': 'older',
  '.':'oldest',
  '-': 'latest',
}[args[0]]

if (action) {
  page(ACTIONS[action], branch)
} else {
  console.log('未知命令')
}
