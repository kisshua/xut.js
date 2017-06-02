/********************************************
 * 虚拟摄像机运行的接口
 ********************************************/

export function extendCamera(access, $$globalSwiper) {

  /**
   * 移动页面
   * 针对当期那页面操作
     λ  position=0，代表DOM页面的最左边，
     λ  position=50，代表DOM页面的中间，
     λ  position=100，代表DOM页面的最右边
   */
  Xut.Camera.MoveX = function (position, speed) {
    $$globalSwiper.scrollToPosition(position, speed)
  }
}
