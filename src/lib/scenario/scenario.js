import { config } from '../config/index'

import MainBar from '../toolbar/sysbar'
import DeputyBar from '../toolbar/fnbar'
import BookBar from '../toolbar/bookbar/index'
import { sceneController } from './controller'
import { Mediator } from '../manager/mediator'

import {
    home,
    scene
} from './layout'

import {
    pMainBar,
    pDeputyBar
} from './bar-config'

import nextTick from '../util/nexttick'

/**
 * 找到对应容器
 * @return {[type]}            [description]
 */
const findContainer = (elements, scenarioId, isMain) => {
    return function(pane, parallax) {
        var node;
        if (isMain) {
            node = '#' + pane;
        } else {
            node = '#' + parallax + scenarioId;
        }
        return elements.find(node)[0];
    }
}


/**
 * 如果启动了缓存记录
 * 加载新的场景
 * @return {[type]} [description]
 */
const checkHistory = (history) => {

    //直接启用快捷调试模式
    if (config.deBugHistory) {
        Xut.View.LoadScenario(config.deBugHistory)
        return true;
    }

    //如果有历史记录
    if (history) {
        var scenarioInfo = sceneController.seqReverse(history)
        if (scenarioInfo) {
            scenarioInfo = scenarioInfo.split('-');
            Xut.View.LoadScenario({
                'scenarioId': scenarioInfo[0],
                'chapterId': scenarioInfo[1],
                'pageIndex': scenarioInfo[2]
            })
            return true;
        } else {
            return false;
        }
    }
}


/**
 * 场景创建类
 * @param  {[type]} seasonId               [description]
 * @param  {[type]} chapterId              [description]
 * @param  {[type]} createCompleteCallback [创建完毕通知回调]
 * @param  {[type]} createMode             [创建模式]
 * @param  {[type]} sceneChainId           [场景ID链,用于后退按钮加载前一个场景]
 * @return {[type]}                        [description]
 */
export class SceneFactory {

    constructor(data) {

        //基本配置信息
        const seasonId = data.seasonId;
        const chapterId = data.chapterId;

        const options = _.extend(this, data, {
            'scenarioId': seasonId,
            'chapterId': chapterId,
            'container': $('#xut-scene-container')
        })

        //创建主场景
        this._createHTML(options, () => {
            //配置工具栏行为
            if (!Xut.IBooks.Enabled) {
                _.extend(this, this._initToolBar())
            }
            //构建Mediator对象
            this._createMediator();
            //注入场景管理
            sceneController.add(seasonId, chapterId, this);
        })
    }

    /**
     * 创建场景
     * @return {[type]} [description]
     */
    _createHTML(options, callback) {

        //如果是静态文件执行期
        //支持Xut.IBooks模式
        //都不需要创建节点
        if (Xut.IBooks.runMode()) {
            this.elements = $('#xut-main-scene')
            callback()
            return;
        }

        let str

        if (options.isMain) {
            str = home()
        } else {
            str = scene(this.scenarioId)
        }

        this.elements = $(str)

        nextTick({
            'container': this.container,
            'content': this.elements
        }, callback)
    }

    _initToolBar() {
        const scenarioId = this.scenarioId
        const pageTotal = this.pageTotal
        const pageIndex = this.pageIndex
        const elements = this.elements
        const findControlBar = function() {
            return elements.find('.xut-control-bar')
        }

        /**
         * 填充配置
         * @return {[type]} [description]
         */
        const fillConfig = function(data) {
            if (_.isUndefined(config.pageMode)) {
                config.pageMode = data.pageMode
            }
            if (_.isUndefined(config.toolType)) {
                config.toolType = data.toolType
            }
        }

        //主场景工具栏设置
        if (this.isMain) {
            fillConfig(pMainBar(scenarioId, pageTotal))
            if (config.scrollPaintingMode) {
                //word模式,自动启动工具条
                this.sToolbar = new BookBar({
                    container  : elements,
                    controlBar : findControlBar(),
                    pageMode   : config.pageMode
                })
            }
            //如果工具拦提供可配置
            //或者config.pageMode 带翻页按钮
            else if (_.some(config.toolType) || config.pageMode ===2) {
                //普通模式
                this.sToolbar = new MainBar({
                    container   : elements,
                    controlBar  : findControlBar(),
                    pageTotal   : pageTotal,
                    currentPage : pageIndex + 1,
                    pageMode    : config.pageMode,
                    toolType    : config.toolType
                })
            }
        }
        //副场景
        else {
            fillConfig(pDeputyBar(this.barInfo, pageTotal))
            if (_.some(config.toolType)) {
                this.cToolbar = new DeputyBar({
                    id          : scenarioId,
                    container   : elements,
                    toolType    : config.toolType,
                    pageTotal   : pageTotal,
                    currentPage : pageIndex,
                    pageMode    : config.pageMode
                })
            }
        }
    }

    /**
     * 构建创建对象
     * @return {[type]} [description]
     */
    _createMediator() {

        var self = this;
        var scenarioId = this.scenarioId;
        var pageTotal = this.pageTotal;
        var pageIndex = this.pageIndex;
        var elements = this.elements;
        var isMain = this.isMain;
        var tempfind = findContainer(elements, scenarioId, isMain)

        //页面容器
        var scenarioPage = tempfind('xut-page-container', 'scenarioPage-');
        //视差容器
        var scenarioMaster = tempfind('xut-master-container', 'scenarioMaster-');


        //场景容器对象
        var vm = this.vm = new Mediator({
            'container': this.elements[0],
            'multiScenario': !isMain,
            'rootPage': scenarioPage,
            'rootMaster': scenarioMaster,
            'initIndex': pageIndex, //保存索引从0开始
            'pagetotal': pageTotal,
            'sectionRang': this.sectionRang,
            'scenarioId': scenarioId,
            'chapterId': this.chapterId,
            'isInApp': this.isInApp //提示页面
        });

        /**
         * 配置选项
         * @type {[type]}
         */
        var isToolbar = this.isToolbar = this.cToolbar ? this.cToolbar : this.sToolbar;


        /**
         * 监听翻页
         * 用于更新页码
         * @return {[type]} [description]
         */
        vm.$bind('pageUpdate', (pageIndex) => {
            isToolbar && isToolbar.updatePointer(pageIndex);
        })


        /**
         * 显示下一页按钮
         * @return {[type]} [description]
         */
        vm.$bind('showNext', () => {
            isToolbar && isToolbar.showNext();
        })


        /**
         * 隐藏下一页按钮
         * @return {[type]} [description]
         */
        vm.$bind('hideNext', () => {
            isToolbar && isToolbar.hideNext();
        })

        /**
         * 显示上一页按钮
         * @return {[type]} [description]
         */
        vm.$bind('showPrev', () => {
            isToolbar && isToolbar.showPrev();
        })


        /**
         * 隐藏上一页按钮
         * @return {[type]} [description]
         */
        vm.$bind('hidePrev', () => {
            isToolbar && isToolbar.hidePrev();
        })

        /**
         * 切换工具栏
         * @return {[type]} [description]
         */
        vm.$bind('toggleToolbar', (state, pointer) => {
            isToolbar && isToolbar.toggle(state, pointer);
        })


        /**
         * 复位工具栏
         * @return {[type]} [description]
         */
        vm.$bind('resetToolbar', () => {
            self.sToolbar && self.sToolbar.reset();
        })


        /**
         * 监听创建完成
         * @return {[type]} [description]
         */
        vm.$bind('createComplete', (nextAction) => {
            self.complete && setTimeout(() => {
                if (isMain) {
                    self.complete(() => {
                        Xut.View.HideBusy()
                            //检测是不是有缓存加载
                        if (!checkHistory(self.history)) {
                            //指定自动运行的动作
                            nextAction && nextAction();
                        }
                        //全局接口,应用加载完毕
                        Xut.Application.AddEventListener();
                    })
                } else {
                    self.complete(nextAction)
                }
            }, 200);
        })


        //如果是读酷端加载
        if (window.DUKUCONFIG && isMain && window.DUKUCONFIG.success) {
            window.DUKUCONFIG.success();
            vm.$init();
            //如果是客户端加载
        } else if (window.CLIENTCONFIGT && isMain && window.CLIENTCONFIGT.success) {
            window.CLIENTCONFIGT.success();
            vm.$init();
        } else {
            //正常加载
            vm.$init();
        }

        /**
         * 绑定桌面调试
         */
        config.debugMode && Xut.plat.isBrowser && this._bindWatch();
    }

    /**
     * 为桌面测试
     * 绑定调试
     * @return {[type]} [description]
     */
    _bindWatch() {
        // for test
        if (Xut.plat.isBrowser) {
            var vm = this.vm;
            this.testWatch = $(".xut-control-pageindex").click(() => {
                console.log('主场景', vm)
                console.log('主场景容器', vm.$scheduler.pageMgr.Collections)
                console.log('主场景视觉差容器', vm.$scheduler.parallaxMgr && vm.$scheduler.parallaxMgr.Collections)
                console.log('多场景', sceneController.expose())
                console.log('数据库', Xut.data);
            })
        }
    }


    /**
     * 销毁场景对象
     * @return {[type]} [description]
     */
    destroy() {
        /**
         * 桌面调试
         */
        if (this.testWatch) {
            this.testWatch.off();
            this.testWatch = null;
        }

        /**
         * 销毁当前场景
         */
        this.vm.$destroy();

        /**
         * 销毁工具栏
         */
        if (this.isToolbar) {
            this.isToolbar.destroy();
            this.isToolbar = null;
        }

        this.container = null;

        //销毁节点
        this.elements.off();
        this.elements.remove();
        this.elements = null;

        //销毁引用
        sceneController.remove(this.scenarioId)
    }
}
