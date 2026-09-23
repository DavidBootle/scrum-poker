import twemoji from '@twemoji/api'

const customEmojiSources = {
  '2660': '/emojis/spade.svg',
  '2660-fe0f': '/emojis/spade.svg',
  '1f980': '/emojies/crab.svg',
  '1f980-fe0f': '/emojis/crab.svg'
}

export default {
  mounted(el) {
    parse(el)
    el._twemojiText = el.textContent
  },

  updated(el) {
    const text = el.textContent

    if (text !== el._twemojiText) {
      parse(el)
      el._twemojiText = el.textContent
    }
  },

  unmounted(el) {
    delete el._twemojiText
  }
}

function parse(el) {
  twemoji.parse(el, {
    folder: 'svg',
    ext: '.svg',
    className: 'emoji',
    callback: (icon, options) => customEmojiSources[icon]
      || `${options.base}${options.folder}/${icon}${options.ext}`
  })
}