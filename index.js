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

async function page({
  action, branch = "master", pagesize = 1
}) {
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

  // ~~checkout到mater分支~~，不需要checkout到分支上log commit
  // await git.checkout(branch)

  if (action === ACTIONS.oldest) {
    const lastCommit = await getCommitStream({
      path: repoGit,
      branch,
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
    let lastCommit = null
    let count = -1 // 因为第一个commit是原commit
    let commit = await getCommitStream({
      path: repoGit,
      branch,
      args: ['--date', 'local', '--until', currentCommitDate],
      onCommits(commitHashs, done) {
        if (count + commitHashs.length >= pagesize) {
          done(commitHashs[pagesize - count - 1])
          return
        }
        count += commitHashs.length
        lastCommit = commitHashs[commitHashs.length - 1]
      }
    })

    if (!commit && lastCommit) {
      commit = lastCommit
    }

    if (commit === currentCommit || !commit) {
      console.log('已翻至初始commit')
    }

    if (commit) {
      await git.checkout(commit)
    }
    return
  } else if (action === ACTIONS.newer) {
    let lastCommit = null
    let finded = false
    let count = 0
    let commit = await getCommitStream({
      path: repoGit,
      branch,
      args: ['--date', 'local', '--since', currentCommitDate, '--reverse'],
      onCommits(commitHashs, done) {
        // git log的date精度只能精确到分钟，所以这里还是会有重复的commit出现
        if (finded) {
          if (count + commitHashs.length >= pagesize) {
            done(commitHashs[pagesize - count - 1])
            return
          }

          count += commitHashs.length
          lastCommit = commitHashs[commitHashs.length - 1]
          return
        }

        let i = 0
        for (;i < commitHashs.length; i += 1) {
          if (currentCommit === commitHashs[i]) {
            break;
          }
        }

        // 找到了commit，开始计数pagesize
        finded = true
        const remain = commitHashs.length - 1 - i
        if (remain >= pagesize) {
          done(commitHashs[i + pagesize])
          return
        }

        count += remain
        lastCommit = commitHashs[commitHashs.length - 1]
        return
      }
    })

    if (!commit && lastCommit) {
      commit = lastCommit
    }

    if (commit === currentCommit) {
      console.log('已经在第一页')
    }

    if (commit) {
      await git.checkout(commit)
    }
    return
  }

  console.error('未知命令');
  return
}

const argv = require('yargs').argv
const { _: args, branch } = argv

const action = {
  'l': 'newer',
  'r': 'older',
  '.':'oldest',
  '-': 'latest',
}[args[0]]

if (action) {
  page({
    action: ACTIONS[action],
    pagesize: args[1],
    branch
  })
} else {
  console.log('未知命令')
}
