import { loadFigure, converURL } from 'core/util/index'
import { config } from 'core/config/index'
import { Share } from './share'

let imageShare = null


function getImage() {
  if (!imageShare) {
    imageShare = new Share()
  }
  if (imageShare) {
    let image = imageShare.get()
    if (image) {
      return image
    }
  }
  return new Image()
}


export function clearImage() {
  if (imageShare) {
    imageShare.destory()
  }
  imageShare = null
}



/**
 * 图片解析
 */
export function imageParse(url, callback) {

  url = converURL(url)

  /**
   * 这里最主要是替换了图片对象，优化了创建
   */
  let imageObject = loadFigure({
    image: getImage(),
    url: url
  }, function(success, hasCache) {
    imageShare && imageShare.add(imageObject) //加入到循环队列
    callback(success, hasCache)
  })

  return {
    destory: function() {
      if (imageObject) {
        imageObject.src = null
        imageObject.removeAttribute("src")
        imageObject = null
      }
    }
  }
}
