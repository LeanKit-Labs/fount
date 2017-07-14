
function getContainerName (name, parts) {
  const lead = parts.slice(0, -1)
  if (name === 'default') {
    return lead.join('.')
  } else {
    return ([ name ].concat(lead)).join('.')
  }
}

function getKey (parts) {
  return parts.slice(-1)[ 0 ]
}

module.exports = {
  getContainerName: getContainerName,
  getKey: getKey
}
