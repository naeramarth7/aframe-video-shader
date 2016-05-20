/**
 * original data is by @Jam3
 * @see https://github.com/Jam3/ios-video-test
 */

import parallel from 'run-parallel'
import media from './media-element'

/* get util from AFRAME */
const { debug } = AFRAME.utils
// debug.enable('shader:video:*')
debug.enable('shader:video:warn')
const warn = debug('shader:video:warn')
const log = debug('shader:video:debug')

const fallback = /i(Pad|Phone)/i.test(navigator.userAgent)
// const fallback = true

const noop = function () {}

exports.inlineVideo = (...args) => {
  args = args[0];

  const src = args.src
  const type = args.type
  const opt = args.opt
  const cb = args.cb

  const { autoplay, preload, muted, loop, fps, canvas, context, render, element } = opt
  const video = element || document.createElement('video')
  let lastTime = Date.now()
  let elapsed = 0
  let duration = Infinity
  let audio

  if (fallback) {

    if (!opt.muted) {
      audio = document.createElement('audio')
      /* disable autoplay for this scenario */
      opt.autoplay = false
    }

    /* load audio and muted video */
    parallel([
      next => {
        media.video({
          sources: src,
          types: type,
          opt: Object.assign({}, opt, {
            muted: true,
            element: video
          }),
          cb: next
        })
      },
      next => {
        media.audio({
          sources: src,
          types: type,
          opt: Object.assign({}, opt, {
            element: audio
          }),
          cb: next
        })
      }
    ], ready)
  } else {
    media.video({
      sources: src,
      types: type,
      opt: Object.assign({}, opt, {
        element: video
      }),
      cb: ready
    })
  }

  /*=============================
  =            ready            =
  =============================*/


  function ready (err) {
    if (err) {
      warn(err)
      cb('Somehow there is error during loading video')
      return
    }
    canvas.width = THREE.Math.nearestPowerOfTwo(video.videoWidth)
    canvas.height = THREE.Math.nearestPowerOfTwo(video.videoHeight)

    if (fallback) {
      video.addEventListener('timeupdate', drawFrame, false)
      if (audio) {
        audio.addEventListener('ended', function () {
          if (loop) {
            audio.currentTime = 0
          } else {
            /**
              TODO:
              - add stop logic
             */

          }
        }, false)
      }
    }

    duration = video.duration

    const canvasVideo = {
      play: play,
      pause: pause,
      tick: tick,
      canvas: canvas,
      video: video,
      audio: audio,
      fallback: fallback,
    }

    cb(null, canvasVideo)


  }

  /*================================
  =            playback            =
  ================================*/

  function play () {
    lastTime = Date.now()
    if (audio) audio.play()
    if (!fallback) video.play()
  }

  function pause () {
    if (audio) audio.pause()
    if (!fallback) video.pause()
  }

  function tick () {
    /* render immediately in desktop */
    if (!fallback) {
      return drawFrame()
    }

    /*
     * in iPhone, we render based on audio (if it exists)
     * otherwise we step forward by a target FPS
     */
    const time = Date.now()
    elapsed = (time - lastTime) / 1000
    if (elapsed >= ((1000 / fps) / 1000)) {
      if (fallback) { /* seek and wait for timeupdate */
        if (audio) {
          video.currentTime = audio.currentTime
        } else {
          video.currentTime = video.currentTime + elapsed
        }
      }
      lastTime = time
    }

    /**
     * in iPhone, when audio is not present we need
     * to track duration
     */

    if (fallback && !audio) {
      if (Math.abs(video.currentTime - duration) < 0.1) {
        /* whether to restart or just stop the raf loop */
        if (loop) {
            video.currentTime = 0
          } else {
            /**
              TODO:
              - add stop logic
             */
          }
      }
    }
  }

  /*============================
  =            draw            =
  ============================*/

  function drawFrame () {
    render(video)
  }

}
