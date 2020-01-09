<template>
  <div>
    <div class="header-container">
      <div class="logo-container">
        <img :src="require('@/assets/logo.png')" />
      </div>
    </div>
    <div class="info-container">
      <el-button
        type="primary"
        round
        size="mini"
        v-if="recognizeServerState!=1"
        @click="resolveToken()"
        :disabled="isUnable"
      >开始识别</el-button>
      <el-button round size="mini" v-if="recognizeServerState==1" @click="suspendProcess()">暂停/继续</el-button>
      <el-button round size="mini" v-if="recognizeServerState==1" @click="closeProcess()">停止</el-button>
      <!-- <span>{{formatMillisecond(time*1000).split(",")[0]}}</span> -->
      <span class="info">
        <h5>
          麦克风状态:
          <span :style="bindStyle(microphoneState)">{{formateMicrophoneState}}</span>
        </h5>
      </span>
      <span class="info">
        <h5>
          实时语音服务:
          <span
            :style="bindStyle(recognizeServerState)"
          >{{formateServerState(recognizeServerState)}}</span>
        </h5>
      </span>
      <span class="info">
        <h5>
          队列服务器:
          <span
            :style="bindStyle(processServerState)"
          >{{formateServerState(processServerState)}}</span>
        </h5>
      </span>
    </div>
    <div class="main-container flex">
      <div class="main-container-box">
        <el-card shadow="hover">
          <div ref="canvasContainer" class="canvas-container">
            <h5 v-show="recognizeServerState!=1">语音识别尚未开始...</h5>
            <h5>{{resultTemp}}</h5>
            <canvas id="canvas" :height="canvas.height" :width="canvas.width"></canvas>
          </div>
        </el-card>
        <el-card shadow="hover">
          <div slot="header">
            <span>唱词</span>
            <el-button
              :disabled="resultList.length==0"
              @click="downloadResults('artical')"
              style="padding:0"
              type="text"
              size="mini"
            >导出唱词文件TXT</el-button>
          </div>
          <div class="artical-container">
            <div v-if="resultList.length!=0">
              <p style="color:#606266">{{artical}}</p>
            </div>
            <h5 v-else>当前唱词结果为空</h5>
          </div>
        </el-card>
      </div>
      <div class="main-container-box">
        <el-card shadow="hover">
          <div slot="header">
            <span>识别结果</span>
            <el-button
              size="mini"
              :disabled="resultList.length==0"
              @click="reverseTimeLine()"
              type="text"
            >正序/反序</el-button>
            <el-button
              size="mini"
              :disabled="resultList.length==0"
              @click="clearResults()"
              type="text"
            >清空</el-button>
            <el-button
              size="mini"
              :disabled="resultList.length==0"
              @click="downloadResults('txt')"
              type="text"
            >导出TXT</el-button>
            <el-button
              size="mini"
              :disabled="resultList.length==0"
              @click="downloadResults('srt')"
              type="text"
            >导出SRT</el-button>
            <el-button
              size="mini"
              :disabled="chunk==null"
              @click="downloadResults('file')"
              type="text"
            >导出录音</el-button>
          </div>
          <div class="result-container">
            <el-timeline v-if="resultList.length!=0" :reverse="reverse">
              <el-timeline-item
                v-for="(item, index) in resultList"
                :key="index"
                :timestamp="formatMillisecond(item.bg)+'-->'+formatMillisecond(item.ed)"
                placement="top"
                v-show="(item.sentence).replace(/，|。|？|！/gi,'')!=''"
              >
                <div class="flex space-between">
                  <div>
                    <p
                      style="color:#606266"
                      v-if="!item.isEditAble"
                      @click="item.isEditAble=true"
                    >{{(item.sentence).replace(/，|。|？|！/gi,"")}}</p>
                    <div v-else>
                      <el-input
                        @blur="item.isEditAble = false"
                        autofocus
                        ref="input"
                        v-model="item.sentence"
                        size="mini"
                      >
                        <el-button
                          @click="item.isEditAble= false"
                          slot="append"
                          icon="el-icon-check"
                        ></el-button>
                      </el-input>
                    </div>
                  </div>
                  <div>
                    <el-button
                      @click="deleteSingleResult(index)"
                      style="padding:0 8px;float:right"
                      type="text"
                      size="mini"
                    >删除</el-button>
                  </div>
                </div>
              </el-timeline-item>
            </el-timeline>
            <h5 v-else>当前识别结果为空</h5>
          </div>
        </el-card>
      </div>
    </div>
    <el-dialog :visible.sync="isHwVisible" title="选择使用场景">
      <p>如果需要添加使用场景,请联系管理员!</p>
      <el-button type="text" @click="connectWs()">不选择使用场景,直接开始实时语音识别</el-button>
      <div class="flex space-around">
        <div style="width:30%">
          <h2>热词树🌲</h2>
          <el-tree :data="hotwordList" :props="defaultProps" @node-click="handleNodeClick"></el-tree>
        </div>

        <div class="detail" style="width:20%">
          <h2>热词列表</h2>
          <div v-if="hotwords">
            <el-tag
              @click="confirmHotword(item,index)"
              class="tag"
              v-for="(item,index) in hotwords"
              :key="index"
              :type="bindTagType(index)"
            >{{item.keyword}}</el-tag>
          </div>
          <div v-else>
            <p>热词列表为空或没有选择热词树节点</p>
          </div>
        </div>
        <div style="width:20%">
          <h2>热词内容预览</h2>
          <div style="height:300px;overflow-y:auto">
            <p style="white-space: pre-line">{{hotWordContent?hotWordContent:"当前热词分类中无热词或未选中热词分类"}}</p>
          </div>
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="connectWsWithHotWord()" v-if="hotWordId!=null" type="primary">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>
<script>
import { AudioCompiler, getUrlKey } from "./../utils/utils";
export default {
  name: "VoiceRecognize",
  data() {
    return {
      isUnable: false,
      isHwVisible: false,
      defaultProps: {
        children: "children",
        label: "name"
      },
      hotwordList: [],
      hotwords: [],
      hotWordId: null,
      hotWordContent: null,
      activeTagIndex: null,
      reverse: true,
      CreateWebSocket: null,
      webSocket: null,
      webSocketForProcess: null,
      resultList: [],
      chunk: null,
      // time: 0,
      // timeInterval: null,
      resultTemp: " ",
      recorder: "",
      canvasCtx: null,
      canvas: {
        width: 0,
        height: 0
      },
      microphoneState: 0,
      processServerState: 0,
      recognizeServerState: 0
    };
  },
  computed: {
    formateMicrophoneState() {
      return this.microphoneState == 0 ? "未启用" : this.microphoneState == 1 ? "已启用" : "错误";
    },
    currentDate() {
      let date = new Date();
      let year = String(date.getFullYear());
      let month = String(date.getMonth() + 1);
      let day = String(this.addZero(date.getDate()));
      let hour = String(date.getHours());
      let minute = String(date.getMinutes());
      let second = String(date.getSeconds());
      return `${year}${month}${day}_${hour}${minute}${second}`;
    },
    artical() {
      let text = "";
      this.resultList.forEach(item => {
        text += item.sentence;
      });
      return text;
    }
  },
  beforeMount() {
    window.onbeforeunload = function(e) {
      e = e || window.event;
      // 兼容IE8和Firefox 4之前的版本
      if (e) {
        e.returnValue = "关闭提示";
      }
      // Chrome, Safari, Firefox 4+, Opera 12+ , IE 9+
      return "关闭提示";
    };
  },
  mounted() {
    this.initCtx();
    this.getHotwordList();
  },
  beforeDestroy() {
    this.closeProcess();
  },
  methods: {
    // beginTiming() {
    //   this.timeInterval = setInterval(() => {
    //     this.time++;
    //   }, 1000);
    // },
    bindTagType(index) {
      return index == this.activeTagIndex ? "success" : "";
    },
    bindStyle(val) {
      return val == 1 ? "color:green" : val == 2 ? "color:red" : "";
    },
    formateServerState(state) {
      return state == 0 ? "未连接" : state == 1 ? "已连接" : "连接出错";
    },
    addZero(val) {
      return val > 9 ? val : "0" + val;
    },
    formatMillisecond(ms) {
      let hour = "00",
        minute = "00",
        second = "00";
      let milli = ms % 1000;
      let tem1 = parseInt(ms / 1000);
      if (tem1 < 60 && tem1 >= 0) {
        return `${hour}:${minute}:${this.addZero(tem1)},${milli}`;
      } else if (tem1 >= 60 && tem1 < 3600) {
        return `${hour}:${this.addZero(parseInt(tem1 / 60))}:${this.addZero(tem1 % 60)},${milli}`;
      } else {
        return `${this.addZero(parseInt(tem1 / 3600))}:${this.addZero(parseInt(tem1 / 60) % 60)}:${this.addZero(tem1 % 60)},${milli}`;
      }
    },
    handleNodeClick(data) {
      this.hotWordContent = null;
      this.activeTagIndex = null;
      this.$axios
        .get(`http://10.20.56.42:2333/open/hw/${data.id}?s=0`, {
          headers: {
            authToken: getUrlKey("token")
          },
          timeout: 5000
        })
        .then(res => {
          if (res.data.status == 200) {
            this.hotwords = res.data.data.words;
          } else {
            this.$message.error("获取热词列表出错");
          }
        });
    },
    getHotwordList() {
      this.$axios
        .get(`http://10.20.56.42:2333/open/hw/category`, {
          headers: {
            authToken: getUrlKey("token")
          },
          timeout: 5000
        })
        .then(res => {
          if (res.data.status == 200) {
            this.hotwordList = res.data.data;
          } else {
            this.$message.error("获取热词树🌲出错");
          }
        });
    },
    confirmHotword(item, index) {
      this.activeTagIndex = index;
      this.hotWordId = item.hotWordId;
      this.$axios.get(`http://10.20.61.3:8211/ast/queryHotWord?hotWordId=${item.hotWordId}`).then(res => {
        if (res.data.code == "000000") {
          this.hotWordContent = JSON.parse(res.data.content.query).hotWord;
        } else {
          this.$message.error("获取热词美容失败");
        }
      });
    },
    connectWsWithHotWord() {
      this.$messageBox
        .confirm("确定要以此场景开始实时语音识别吗?", "提示", {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning"
        })
        .then(() => {
          this.connectWs();
        });
    },
    connectWs() {
      this.isHwVisible = false;
      this.chunk = null;
      this.CreateWebSocket = (() => {
        return urlValue => {
          if (window.WebSocket) return new WebSocket(urlValue);
          if (window.MozWebSocket) return new MozWebSocket(urlValue);
          return false;
        };
      })();
      this.webSocketForProcess = this.CreateWebSocket("ws://10.20.50.140:18092/websocket/1");
      this.webSocketForProcess.onopen = () => {
        this.processServerState = 1;
      };

      this.webSocketForProcess.onmessage = message => {
        if (JSON.parse(message.data).status == "success") {
          this.initRecognizeWs();
        } else {
          this.$message.error("与服务器校验出错或超出最大连接数");
        }
      };
      this.webSocketForProcess.onclose = () => {
        this.processServerState = 0;
      };
      this.webSocketForProcess.onerror = () => {
        this.processServerState = 2;
        this.$message.error("连接鉴权服务器出错");
      };
    },
    initRecognizeWs() {
      let recognizeWsUrl = "ws://10.20.50.140:18211/ast?lang=cn&codec=pcm_s16le&samplerate=16000";
      if (this.hotWordId != null) {
        recognizeWsUrl += `&hotWordId=${this.hotWordId}`;
      }
      this.webSocket = this.CreateWebSocket(recognizeWsUrl);
      this.webSocket.onopen = e => {
        this.recognizeServerState = 1;
        this.$message.success("ws 已开启,连接成功");
        this.onWsMessage();
        this.catchStream();
        // this.beginTiming();
      };
      this.webSocket.onclose = e => {
        this.recognizeServerState = 0;
        this.$message.info("实时语音识别连接已关闭");
      };
      this.webSocket.onerror = e => {
        this.recognizeServerState = 2;
        this.$message.error("ws连接出错");
      };
    },
    onWsMessage() {
      this.webSocket.onmessage = message => {
        this.resultTemp = " ";
        if (JSON.parse(message.data).sessionId) {
        } else {
          let messageResult = JSON.parse(message.data);

          if (messageResult.msgtype == "sentence") {
            let sentence = "";
            for (let i = 0; i < messageResult.ws.length; i++) {
              sentence += messageResult.ws[i].cw[0].w;
              if (messageResult.ws[i].cw[0].wp == "p" || i == messageResult.ws.length - 1) {
                this.resultList.push({
                  bg: messageResult.bg + messageResult.ws[i].cw[0].wb * 10,
                  ed: messageResult.bg + messageResult.ws[i].cw[0].we * 10,
                  sentence: sentence,
                  isEditAble: false
                });
                sentence = "";
              }
            }
          } else if (messageResult.msgtype == "progressive") {
            let sentence = "";
            messageResult.ws.forEach(item => {
              sentence += item.cw[0].w;
            });
            this.resultTemp = sentence.split(1)[0];
          }
        }
      };
    },
    clearResults() {
      this.resultList = [];
    },
    downloadResults(type) {
      let downloadResult = "";
      if (type == "srt") {
        this.resultList.forEach((item, index) => {
          downloadResult += `${index + 1}\r\n${this.formatMillisecond(item.bg)} --> ${this.formatMillisecond(item.ed)}\r\n${
            item.sentence
          }\r\n\r\n`;
        });
      } else if (type == "txt") {
        this.resultList.forEach(item => {
          downloadResult += item.sentence + "\r\n";
        });
      } else if (type == "file") {
        this.downloadResult = this.chunk;
      } else if (type == "artical") {
        downloadResult = this.artical;
      }
      let blob = type == "file" ? this.chunk : new Blob([downloadResult]);
      let fileUrl = `${this.currentDate}实时语音.${type == "srt" ? "srt" : type == "file" ? "wav" : "txt"}`;
      if ("msSaveOrOpenBlob" in navigator) {
        window.navigator.msSaveOrOpenBlob(blob, fileUrl);
      } else {
        let downloadElement = document.createElement("a");
        let href = window.URL.createObjectURL(blob);
        downloadElement.href = href;
        downloadElement.download = fileUrl;
        document.body.appendChild(downloadElement);
        downloadElement.click();
        document.body.removeChild(downloadElement);
        window.URL.revokeObjectURL(href);
      }
    },
    reverseTimeLine() {
      this.reverse = !this.reverse;
    },
    deleteSingleResult(index) {
      this.resultList.splice(index, 1);
    },
    catchStream() {
      let constraints = {
        audio: true,
        video: false
      };
      let getMedia = navigator.mediaDevices || navigator.webkitGetUserMedia;
      if (getMedia) {
        getMedia
          .getUserMedia(constraints)
          .then(mediaStream => {
            this.microphoneState = 1;
            //录音
            this.recorder = new MediaRecorder(mediaStream);
            this.recorder.start();
            this.recorder.ondataavailable = this.getRecordingData;
            //音频可视化与实时语音识别
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initAnalyser();
            let audioInput = this.audioContext.createMediaStreamSource(mediaStream);
            let compressScript = this.audioContext.createScriptProcessor();
            compressScript.onaudioprocess = this.compressProgress;
            audioInput.connect(this.analyser);
            this.analyser.connect(compressScript);
            compressScript.connect(this.audioContext.destination);
          })
          .catch(err => {
            this.$message.error(err.name + ": " + err.message);
          });
      } else {
        this.microphoneState = 2;
        this.$message.error("无法使用麦克风");
      }
    },
    getRecordingData(e) {
      this.chunk = e.data;
    },
    compressProgress(e) {
      this.draw();
      const buffer = e.inputBuffer.getChannelData(0);
      const audioCompiler = new AudioCompiler();
      const compressedBuffer = audioCompiler.convertBuffer(buffer);
      const int8Array = new Int8Array(compressedBuffer.buffer);
      this.webSocket.send(int8Array);
    },
    suspendProcess() {
      if (this.audioContext.state == "running") {
        this.audioContext.suspend();
      } else if (this.audioContext.state == "suspended") {
        this.audioContext.resume();
      }
      if (this.recorder.state == "paused") {
        this.recorder.resume();
      } else if (this.recorder.state == "recording") {
        this.recorder.pause();
      }
    },
    closeProcess() {
      if (this.audioContext) {
        this.audioContext.close();
      }
      if (this.webSocket) {
        this.webSocket.close();
      }
      if (this.webSocketForProcess) {
        this.webSocketForProcess.close();
      }
      if (this.recorder) {
        this.recorder.stop();
      }
    },
    initAnalyser() {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 128;
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
    },
    //初始化 ctx 尺寸
    initCtx() {
      this.canvas.width = this.$refs.canvasContainer.offsetWidth - 5;
      this.canvas.height = this.$refs.canvasContainer.offsetHeight - 5;
    },
    //绘图
    draw() {
      const canvas = document.getElementById("canvas");
      this.canvasCtx = canvas.getContext("2d");
      let cWidth = this.canvas.width,
        cHeight = this.canvas.height,
        barWidth = parseInt((1.8 * cWidth) / this.bufferLength),
        barHeight,
        x = 0;
      this.canvasCtx.clearRect(0, 0, cWidth, cHeight);
      //分析器获取音频数据“切片”
      this.analyser.getByteFrequencyData(this.dataArray);

      //把每个音频“切片”画在画布上
      for (var i = 0; i < this.bufferLength; i++) {
        barHeight = parseInt(1.4 * this.dataArray[i]);
        let color = `rgb(${i + 87}, ${6 * i + 174},${6 * i + 248})`;
        this.canvasCtx.fillStyle = color;
        this.canvasCtx.fillRect(x, cHeight - barHeight, barWidth, barHeight);
        x += barWidth + 5;
      }
    },
    //解析 token
    resolveToken() {
      this.$axios
        .post(
          `http://10.20.56.42:9001/tool`,
          {},
          {
            headers: { Authorization: getUrlKey("token"), timeout: 5000 }
          }
        )
        .then(res => {
          if (res.data.code == 200) {
            let toolIndex = res.data.data.findIndex(item => {
              return item.permissionCode == "tool_voice_lighting";
            });
            if (toolIndex != -1) {
              this.isUnable = false;
              this.isHwVisible = true;
              // this.connectWs();
            } else {
              this.isUnable = true;
              this.$message.error("您暂时无法使用此工具");
            }
          } else {
            this.$message.error("无法验证使用权限,请尝试重新登录");
            this.isUnable = true;
          }
        })
        .catch(() => {
          this.$message.error("请启用'不安全的脚本'后重试");
          this.isUnable = true;
        });
    }
  }
};
</script>
<style lang="scss">
$body_margin_left: 15%;
.header-container {
  width: 100%-2 * $body_margin_left;
  margin-left: $body_margin_left;
  border-bottom: 1px solid #bec3c6;
  height: 50px;
  & .logo-container {
    height: 70%;
    margin-top: 15px;
    & img {
      max-height: 100%;
    }
  }
}
.info-container {
  width: 100%-2 * $body_margin_left;
  margin-left: $body_margin_left;
  height: 40px;
  & .el-button {
    margin-top: 7px;
  }
  & .info {
    float: right;
    padding: 7px;
  }
}

.main-container {
  width: 100%-2 * $body_margin_left;
  margin-left: $body_margin_left;
  & .el-card {
    margin: 3px;
  }
  & .main-container-box {
    width: 50%;
  }
  & .main-container-box {
    & .canvas-container {
      height: 37vh;
    }
    & .artical-container {
      height: 33vh;
      overflow-y: auto;
    }
    & .result-container {
      height: 72vh;
      overflow-y: auto;
      & .el-timeline-item {
        margin: 5px;
      }
      & .el-timeline-item:hover {
        background-color: #d2d8df;
      }
    }
  }
}

h5 {
  color: #506581;
}

.flex {
  display: flex;
}
.space-between {
  justify-content: space-between;
}
.space-around {
  justify-content: space-around;
}
.tag {
  margin: 3px;
  cursor: pointer;
}
</style>