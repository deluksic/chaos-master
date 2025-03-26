import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylistic,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      'no-restricted-globals': [
        'error',
        'blur',
        'captureEvents',
        'chrome',
        'clientInformation',
        'close',
        'closed',
        'createImageBitmap',
        'crypto',
        'customElements',
        'defaultStatus',
        'defaultstatus',
        'devicePixelRatio',
        'external',
        'find',
        'focus',
        'frameElement',
        'frames',
        'getComputedStyle',
        'getSelection',
        'indexedDB',
        'innerHeight',
        'innerWidth',
        'isSecureContext',
        'length',
        'location',
        'locationbar',
        'matchMedia',
        'menubar',
        'moveBy',
        'moveTo',
        'name',
        'navigator',
        'onabort',
        'onafterprint',
        'onanimationend',
        'onanimationiteration',
        'onanimationstart',
        'onappinstalled',
        'onauxclick',
        'onbeforeinstallprompt',
        'onbeforeprint',
        'onbeforeunload',
        'onblur',
        'oncancel',
        'oncanplay',
        'oncanplaythrough',
        'onchange',
        'onclick',
        'onclose',
        'oncontextmenu',
        'oncuechange',
        'ondblclick',
        'ondevicemotion',
        'ondeviceorientation',
        'ondeviceorientationabsolute',
        'ondrag',
        'ondragend',
        'ondragenter',
        'ondragleave',
        'ondragover',
        'ondragstart',
        'ondrop',
        'ondurationchange',
        'onemptied',
        'onended',
        'onerror',
        'onfocus',
        'ongotpointercapture',
        'onhashchange',
        'oninput',
        'oninvalid',
        'onkeydown',
        'onkeypress',
        'onkeyup',
        'onlanguagechange',
        'onload',
        'onloadeddata',
        'onloadedmetadata',
        'onloadstart',
        'onlostpointercapture',
        'onmessage',
        'onmessageerror',
        'onmousedown',
        'onmouseenter',
        'onmouseleave',
        'onmousemove',
        'onmouseout',
        'onmouseover',
        'onmouseup',
        'onmousewheel',
        'onoffline',
        'ononline',
        'onpagehide',
        'onpageshow',
        'onpause',
        'onplay',
        'onplaying',
        'onpointercancel',
        'onpointerdown',
        'onpointerenter',
        'onpointerleave',
        'onpointermove',
        'onpointerout',
        'onpointerover',
        'onpointerup',
        'onpopstate',
        'onprogress',
        'onratechange',
        'onrejectionhandled',
        'onreset',
        'onresize',
        'onscroll',
        'onsearch',
        'onseeked',
        'onseeking',
        'onselect',
        'onstalled',
        'onstorage',
        'onsubmit',
        'onsuspend',
        'ontimeupdate',
        'ontoggle',
        'ontransitionend',
        'onunhandledrejection',
        'onunload',
        'onvolumechange',
        'onwaiting',
        'onwebkitanimationend',
        'onwebkitanimationiteration',
        'onwebkitanimationstart',
        'onwebkittransitionend',
        'onwheel',
        'open',
        'openDatabase',
        'opener',
        'origin',
        'outerHeight',
        'outerWidth',
        'pageXOffset',
        'pageYOffset',
        'parent',
        'performance',
        'personalbar',
        'postMessage',
        'print',
        'releaseEvents',
        'resizeBy',
        'resizeTo',
        'screen',
        'screenLeft',
        'screenTop',
        'screenX',
        'screenY',
        'scroll',
        'scrollBy',
        'scrollTo',
        'scrollX',
        'scrollY',
        'scrollbars',
        'self',
        'speechSynthesis',
        'status',
        'statusbar',
        'stop',
        'styleMedia',
        'toolbar',
        'top',
        'visualViewport',
        'webkitRequestFileSystem',
        'webkitResolveLocalFileSystemURL',
        'webkitStorageInfo',
      ],
    },
  },
)
