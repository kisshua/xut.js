import { config } from '../../../config/index'
import PinchPan from '../pinch.pan'
import {
    $$on,
    $$off
} from '../../../util/dom'

import {
    createUnpeatableNumbers,
    createContainerView,
    chooseImgSource,
    execAnimation,
    getImgConfig,
    getFinalImgConfig
} from './util'


function setTransition(el, property = 'all', speed = 150, easing = 'ease') {
    el.css('transition', property + ' ' + speed + 'ms ' + easing);
}

/**
 * 图片缩放功能
 * 2016.12.5
 */
export default class Zoom {

    constructor({
        element, //img node
        originalSrc, //原始图地址
        hdSrc //高清图地址
    }) {

        //如果没有传递父容器
        //需要给元素的子元素包含一个div父容器
        //这里主要给flow的流式排版处理
        //img是行内元素，获取尺寸有问题
        let container = element.wrap('<div/>').parent()

        //白色背景
        if (!$("div.gamma-overlay").length) {
            $('<div class="gamma-overlay"></div>').appendTo($('body'))
        }
        this.$overlay = $('div.gamma-overlay')

        //获取图片的可视区的绝对布局尺寸
        this.originImgWidth = element.width()
        this.originImgHeight = element.height()
        this.originImgLeft = container.offset().left + (container.outerWidth(true) - container.width()) / 2
        this.originImgTop = container.offset().top + (container.outerHeight(true) - container.height()) / 2

        this.originSrc = originalSrc
        this.hdSrc = hdSrc
        this.$imgNode = element
        this.$container = container

        this.$body = $('body')

        //动画中
        this.isAniming = false

        this.source = [{
            pos: 0,
            src: hdSrc ? hdSrc : originalSrc,
            width: 200
        }]

        this._init()
    }

    /**
     * 创建包裹容器
     * @return {[type]} [description]
     */
    _createWarp() {
        this.$container = this.$imgNode.wrap('<div/>').parent()
    }

    /**
     * 初始化
     * @return {[type]} [description]
     */
    _init() {
        this._initSingleView()
        this._createFlyNode()
        this.targetSize = this._getData()
        this._startZoom()
    }

    _initSingleView() {
        if (!$("div.gamma-single-view").length) {
            let html;
            const viewSize = config.viewSize
            const right = viewSize.overflowWidth && Math.abs(viewSize.right) || 0
            const top = viewSize.overflowHeight && Math.abs(viewSize.top) || 0

            const rightCopy = right + 4;
            const rightCopy2 = right + 3.5;
            const topCopy = top + 4;
            //移动端
            //横屏
            if (this.screenWidth > this.screenHeight) {
                html = `<div class="gamma-single-view"><div class="gamma-options gamma-options-single"><div class="gamma-btn-close ionicons ion-ios-close" style="font-size:6vw;width:6vw;height:6vw; position:absolute;top:${topCopy}px;right:${rightCopy}px;z-index:10001;text-align:center;cursor:pointer;"><div class="ionicons ion-ios-close-outline" style="position:absolute;top:0;right:${rightCopy2}px;cursor:pointer;"></div></div></div></div>`;
            } else {
                //竖屏
                html = `<div class="gamma-single-view"><div class="gamma-options gamma-options-single"><div class="gamma-btn-close ionicons ion-ios-close" style="font-size:6vh;width:6vh;height:6vh;position:absolute;top:${topCopy}px;right:${rightCopy}px;z-index:10001;text-align:center;cursor:pointer;"><div class="ionicons ion-ios-close-outline" style="position:absolute;top:0;right:${rightCopy2};cursor:pointer;"></div></div></div></div>`;

            }
            $(String.styleFormat(html)).appendTo(this.$body);
        }
        this.$singleView = this.$body.children('div.gamma-single-view');
        this.$closeButton = this.$singleView.find('div.gamma-btn-close')
        this.$closeButton.hide();
        this.callbackEnd = () => {
            this._closeSingleView()
        }

        //关闭按钮
        $$on(this.$closeButton[0], {
            end: this.callbackEnd,
            cancel: this.callbackEnd
        })
    }

    /**
     * 创建原图img对象，克隆到新的节点
     * 用于缩放
     * @return {[type]} [description]
     */
    _createFlyNode() {
        this.$flyNode = $('<img/>').attr('src', this.originSrc).addClass('gamma-img-fly').css({
            width: this.originImgWidth,
            height: this.originImgHeight,
            left: this.originImgLeft,
            top: this.originImgTop
        }).appendTo($('body'))
        setTransition(this.$flyNode)
    }

    /**
     * 初始化缩放数据
     * @return {[type]} [description]
     */
    _getData() {
        return getImgConfig({
            sources: this.source,
            wrapper: {
                width: config.screenSize.width,
                height: config.screenSize.height
            },
            image: {
                width: this.originImgWidth,
                height: this.originImgHeight
            }
        })
    }

    /**
     * 执行缩放
     * @return {[type]} [description]
     */
    _startZoom() {
        let source = this.targetSize.source
        let position = this.targetSize.position

        //白色背景动画
        this.$overlay.show()
        setTransition(this.$overlay, 'opacity');
        execAnimation({
            element: this.$overlay,
            style: { opacity: 1 },
            speed: 100
        })

        this.$container.css('visibility', 'hidden')

        this.$closeButton.show()

        //克隆的原图放大动画
        execAnimation({
            element: this.$flyNode,
            style: {
                width: position.width,
                height: position.height,
                left: position.left + $(window).scrollLeft(),
                top: position.top + $(window).scrollTop()
            },
            speed: 200
        }, () => {
            this._replaceHQIMG(position, source.src)
        })

    }

    /**
     * 创建高清图
     */
    _createHQIMG(position, src, callback) {
        var self = this
        this.$hQNode = $('<img/>').load(function() {
            let $img = $(this);
            //高清图
            $img.css({
                width: position.width,
                height: position.height,
                left: position.left,
                top: position.top
            }).appendTo(self.$singleView);
            setTransition($img, 'all', 100, 'ease-in-out');
            callback()
        }).attr('src', src);
    }

    /**
     * 替换成高清图
     */
    _replaceHQIMG(position, src) {
        //如果存在高清图
        if (this.hdSrc) {
            this._createHQIMG(position, src, () => {
                setTransition(this.$flyNode, 'opacity', 100);
                //删除飞入图片
                //用高清图替代了
                execAnimation({
                    element: this.$flyNode,
                    style: { 'opacity': 0 },
                    speed: 100
                }, () => {
                    this.$flyNode.remove()
                    this.$flyNode = null
                })
            })
        }

        //是否启动图片缩放
        if (!this.slideObj && Xut.plat.hasTouch && config.salePicture) {
            //如果没有高清图，采用原图
            let $node = this.hdSrc ? this.$hQNode : this.$flyNode
            this.slideObj = new PinchPan({
                hasButton: false,
                $pagePinch: $node
            })
        }
    }

    /**
     * 复位原始图的坐标
     * @return {[type]} [description]
     */
    _resetOriginPox() {
        this.$flyNode.css({
            width: this.originImgWidth,
            height: this.originImgHeight,
            left: this.originImgLeft,
            top: this.originImgTop
        })

        //还原缩放
        if (this.slideObj) {
            this.slideObj.reset()
        }
    }

    /**
     * 关闭放大高清图
     * @return {[type]} [description]
     */
    _closeSingleView() {

        if (this.isAniming) {
            return
        }
        this.isAniming = true
        let $node = this.hdSrc ? this.$hQNode : this.$flyNode
        let l = $node.position().left + $(window).scrollLeft()
        let t = $node.position().top

        $node.appendTo(this.$body).css({
            position: 'absolute',
            zIndex: 10000,
            left: l,
            top: t
        });

        setTransition($node, 'all', 300);
        this.$singleView.hide();

        execAnimation({
            element: $node,
            style: {
                width: this.originImgWidth,
                height: this.originImgHeight,
                left: this.originImgLeft,
                top: this.originImgTop
            },
            speed: 100
        }, () => {
            this.$container.css('visibility', 'visible');
            $node.remove()
        })

        //消失背景
        setTransition(this.$overlay, 'opacity')
        execAnimation({
            element: this.$overlay,
            style: { opacity: 0 },
            speed: 100
        }, () => {
            this.$overlay.hide()
        })

        //还原原节点
        this.$imgNode.insertBefore(this.$container)
        this.$container.remove()
    }

    /**
     * 对外接口
     * 播放
     * @return {[type]} [description]
     */
    play() {
        this._init()
    }

    /**
     * 对外接口
     * 销毁
     * @return {[type]} [description]
     */
    destroy() {

        this.$viewContainer.hide()

        //创建2个图片node
        this.$flyNode.remove()
        this.$hQNode && this.$hQNode.remove()

        //关闭按钮
        $$off(this.$closeButton[0], {
            end: this.callbackEnd,
            cancel: this.callbackEnd
        })

        if (this.slideObj) {
            this.slideObj.destroy()
        }

        this.$container = null
        this.$flyNode = null
        this.$hQNode = null
        this.$imgNode = null
        this.$overlay = null
        this.$singleView = null
        this.$closeButton = null
        this.$viewContainer.remove()
        this.$viewContainer = null
    }

}
