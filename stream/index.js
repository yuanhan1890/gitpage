const spawn = require('child_process').spawn

function getCommitStream({
  path: repoPath,
  args = [],
  onCommits
}) {
  const ops = args.slice()
  ops.unshift('log')
  ops.unshift('--git-dir=' + repoPath)
  // ops.push('--date', 'unix')

  const proc = spawn('git', ops)

  proc.stdout.setEncoding('utf-8')


  return new Promise((resolve, reject) => {
    let ended = false
    proc.stdout.on('data', (content) => {
      if (ended) return

      const commits = content
        .split('\n')
        .reduce((commits_, line) => {
          if (!line.startsWith('commit')) {
            return commits_
          }

          const [_, hash] = line.split(' ')
          commits_.push(hash)
          return commits_
        }, [])

      onCommits(commits, (result) => {
        ended = true
        resolve(result)
      })
    })
    proc.stdout.on('end', () => {
      resolve()
    })
    proc.stderr.on('data', (e) => {
      reject(e)
    })
  })
}

module.exports = getCommitStream;
