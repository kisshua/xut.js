import { HOT, CONTENT, SEASON, COLUMN } from './audio-type'
import {
  initBox,
  loadAudio,
  getPlayBox,
  removeAudio
} from './manager'


///////////////////
//1 独立音频处理, 音轨/跨页面 //
//2 动画音频,跟动画一起播放与销毁
///////////////////

/*代码初始化*/
export function initAudio() {
  initBox()
}

/*
 音频在创建dom的时候需要查下，这个hot对象是否已经被创建过
 如果创建过，那么图标状态需要处理
*/
export function hasHotAudioPlay(pageId, queryId) {
  const playBox = getPlayBox()
  if (playBox[HOT] && playBox[HOT][pageId]) {
    const audioObj = playBox[HOT][pageId][queryId]
    if (audioObj && audioObj.status === 'playing') {
      return true
    }
  }
}

/**
 * 自动播放触发接口
 */
export function autoAudio(chapterId, activityId, data) {
  loadAudio({
    pageId: chapterId,
    queryId: activityId,
    type: HOT,
    action: 'auto',
    data: data
  })
}


/**
 * 手动触发
 */
export function triggerAudio({
  data,
  columnData,
  activityId,
  chapterId
}) {
  loadAudio({
    data,
    columnData,
    pageId: chapterId,
    queryId: activityId,
    type: HOT,
    action: 'trigger'
  })
}


/**
 * 节音频触发接口
 */
export function seasonAudio(seasonAudioId, audioId) {
  loadAudio({
    pageId: seasonAudioId,
    queryId: audioId,
    type: SEASON
  })
}


/**
 * 动画音频触发接口
 */
export function createContentAudio(pageId, audioId) {
  loadAudio({
    pageId: pageId,
    queryId: audioId,
    type: CONTENT
  })
}

/**
 * 销毁动画音频
 */
export function clearContentAudio(pageId) {
  const playBox = getPlayBox()
  if (!playBox[CONTENT] || !playBox[CONTENT][pageId]) {
    return false;
  }
  const playObj = playBox[CONTENT][pageId];
  if (playObj) {
    for (let i in playObj) {
      playObj[i].destroy();
      playObj[i] = null
      delete playBox[CONTENT][pageId][i];
    }
  }
}

/*
2017.5.8新增
每个column页面支持音频，所以翻页就删除
这里不需要页码区分，因为全删
 */
export function clearColumnAudio() {
  const playBox = getPlayBox();
  /*清理视频*/
  if (playBox && playBox[HOT] && playBox[HOT][COLUMN]) {
    const playObjs = playBox[HOT][COLUMN]
    for (let player in playObjs) {
      playObjs[player].destroy();
      playObjs[player] = null
    }
    delete playBox[HOT][COLUMN]
  }
}

/**
 * 获取媒体数据，视频音频
 */
export function getMediaData(type, queryId) {
  if (type === CONTENT || type === SEASON) {
    return Xut.data.query('Video', queryId, true);
  } else {
    return Xut.data.query('Video', queryId);
  }
}

/**
 * 挂起音频
 */
export function hangUpAudio() {
  const playBox = getPlayBox()
  var t, p, a;
  for (t in playBox) {
    for (p in playBox[t]) {
      for (a in playBox[t][p]) {
        playBox[t][p][a].pause();
      }
    }
  }
}


/**
 * 清理音频
 */
export function clearAudio(pageId) {
  if (pageId) { //如果只跳槽关闭动画音频
    clearContentAudio(pageId)
  } else {
    removeAudio() //多场景模式,不处理跨页面
  }
}