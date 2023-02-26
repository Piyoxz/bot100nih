const { Sticker } = require('wa-sticker-formatter');

async function sticker(img) {
  const stickerMetadata = {
    type: 'full', //can be full or crop
    pack: 'punya',
    author: 'piyo',
    categories: 'deswita',
  }
  return await new Sticker(img, stickerMetadata).build()
}

module.exports = { sticker }
