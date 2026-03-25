const convertArrayBufferToHexString = (arrayBuffer: ArrayBuffer) => {
  return Array.from(new Uint8Array(arrayBuffer))
    .map((bufferValue) => {
      return bufferValue.toString(16).padStart(2, '0')
    })
    .join('')
}

export const createPasswordHash = async (password: string): Promise<string> => {
  const encodedPassword = new TextEncoder().encode(password)

  return window.crypto.subtle.digest('SHA-512', encodedPassword).then((passwordHashBuffer) => {
    return Promise.resolve(convertArrayBufferToHexString(passwordHashBuffer))
  })
}
