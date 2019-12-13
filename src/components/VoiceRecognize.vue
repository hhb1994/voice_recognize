<template>
  <div>
    <div class="header">
      <el-button v-if="recognizeServerState!=1" @click="connectWs()">开始语音识别</el-button>
      <el-button v-if="recognizeServerState==1" @click="suspendProcess()">
        <!-- {{audioContext.state=="running"?"暂停":"恢复"}} -->
        暂停/继续
      </el-button>
      <el-button v-if="recognizeServerState==1" @click="closeProcess()">停止</el-button>
      <span style="float:right;padding-left:10px">
        <h5>
          麦克风状态:
          <span :style="bindStyle(microphoneState)">{{formateMicrophoneState}}</span>
        </h5>
      </span>
      <span style="float:right;padding-left:10px">
        <h5>
          实时语音服务连接状态:
          <span
            :style="bindStyle(recognizeServerState)"
          >{{formateServerState(recognizeServerState)}}</span>
        </h5>
      </span>
      <span style="float:right;padding-left:10px">
        <h5>
          队列服务器连接状态:
          <span
            :style="bindStyle(processServerState)"
          >{{formateServerState(processServerState)}}</span>
        </h5>
      </span>
    </div>
    <div class="flex">
      <div class>
        <el-card shadow="hover">
          <div ref="canvasContainer" class="canvasContainer">
            <h5 v-show="recognizeServerState!=1">语音识别尚未开始...</h5>
            <h5>{{resultTemp}}</h5>
            <canvas id="canvas" :height="canvas.height" :width="canvas.width"></canvas>
          </div>
        </el-card>
        <el-card shadow="hover" style="margin-top:5px">
          <div slot="header">
            <span>唱词</span>
            <el-button
              :disabled="resultList.length==0"
              @click="downloadResults('artical')"
              style="float: right; padding: 3px 0"
              type="text"
            >导出唱词文件</el-button>
          </div>
          <div class="articalContainer">
            <div v-if="resultList.length!=0">
              <p style="color:#606266">{{artical}}</p>
            </div>
            <h5 v-else>当前唱词结果为空</h5>
          </div>
        </el-card>
      </div>
      <div class="container2">
        <el-card shadow="hover" style="height:95%;overflow-y: auto">
          <div slot="header">
            <span>识别结果</span>
            <el-button
              :disabled="resultList.length==0"
              @click="clearResults()"
              style="float: right; padding: 3px 0"
              type="text"
            >清空识别内容</el-button>
            <el-button
              :disabled="resultList.length==0"
              @click="downloadResults('txt')"
              style="float: right; padding: 3px 5px"
              type="text"
            >导出 TXT 文件</el-button>
            <el-button
              :disabled="resultList.length==0"
              @click="downloadResults('srt')"
              style="float: right; padding: 3px 0"
              type="text"
            >导出 SRT 文件</el-button>
            <el-button
              :disabled="chunk==null"
              @click="downloadResults('file')"
              style="float: right; padding: 3px 0"
              type="text"
            >导出录音文件</el-button>
            <el-button
              :disabled="resultList.length==0"
              @click="reverseTimeLine()"
              style="padding:0"
              type="text"
            >正序/反序</el-button>
          </div>
          <el-timeline v-if="resultList.length!=0" :reverse="reverse">
            <el-timeline-item
              v-for="(item, index) in resultList"
              :key="index"
              :timestamp="item.bg+'-->'+item.ed"
              placement="top"
            >
              <div class="flex">
                <div style="width:80%">
                  <p
                    style="color:#606266"
                    v-if="!item.isEditAble"
                    @click="edit(item)"
                  >{{item.sentence}}</p>
                  <div v-else>
                    <el-input autofocus ref="input" v-model="item.sentence" size="small">
                      <el-button @click="quitEdit(item)" slot="append" icon="el-icon-check"></el-button>
                    </el-input>
                  </div>
                </div>
                <div>
                  <el-button @click="deleteSingleResult(index)" style="padding-top:0" type="text">删除</el-button>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <h5 v-else>当前识别结果为空</h5>
        </el-card>
      </div>
    </div>
  </div>
</template>
<script>
import { AudioCompiler } from "./../utils/utils";
export default {
  name: "VoiceRecognize",
  data() {
    return {
      reverse: true,
      webSocket: null,
      webSocketForProcess: null,
      resultList: [],
      chunk: null,
      resultTemp: "",
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
      let day = String(this.addZero(date.getDay()));
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
  mounted() {
    this.canvas.width = this.$refs.canvasContainer.offsetWidth - 10;
    this.canvas.height = this.$refs.canvasContainer.offsetHeight - 10;
  },
  beforeDestroy() {
    this.closeProcess();
  },
  methods: {
    edit(item) {
      item.isEditAble = true;
    },
    quitEdit(item) {
      item.isEditAble = false;
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
    connectWs() {
      let CreateWebSocket = (() => {
        return urlValue => {
          if (window.WebSocket) return new WebSocket(urlValue);
          if (window.MozWebSocket) return new MozWebSocket(urlValue);
          return false;
        };
      })();
      this.webSocketForProcess = CreateWebSocket("ws://10.20.38.105:8089/websocket/1");
      this.webSocketForProcess.onopen = () => {
        this.processServerState = 1;
        this.webSocket = CreateWebSocket("ws://10.20.61.3:8211/ast?lang=cn&codec=pcm_s16le&samplerate=16000");
        this.webSocket.onopen = e => {
          this.recognizeServerState = 1;
          console.log("ws 已开启,连接成功");
          this.onWsMessage();
          this.catchStream();
        };
        this.webSocket.onclose = e => {
          this.recognizeServerState = 0;
          console.log("ws 已关闭");
        };
        this.webSocket.onerror = e => {
          this.recognizeServerState = 2;
          console.log("ws连接出错");
        };
      };
      this.webSocketForProcess.onclose = () => {
        this.processServerState = 0;
      };
      this.webSocketForProcess.onerror = () => {
        this.processServerState = 2;
      };
    },
    onWsMessage() {
      this.webSocket.onmessage = message => {
        this.resultTemp = " ";
        if (JSON.parse(message.data).sessionId) {
          console.log(JSON.parse(message.data).sessionId);
        } else {
          let messageResult = JSON.parse(message.data);
          let sentence = "";
          messageResult.ws.forEach(item => {
            sentence += item.cw[0].w;
          });
          if (JSON.parse(message.data).msgtype == "sentence" && sentence != "。") {
            this.resultList.push({
              bg: this.formatMillisecond(messageResult.bg),
              ed: this.formatMillisecond(messageResult.ed),
              sentence: sentence,
              isEditAble: false
            });
          } else if (JSON.parse(message.data).msgtype == "progressive") {
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
          downloadResult += `${index + 1}\r\n${item.bg} --> ${item.ed}\r\n${item.sentence}\r\n\r\n`;
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
      if ("msSaveOrOpenBlob" in navigator) {
        window.navigator.msSaveOrOpenBlob(blob, `${fileName}`);
      } else {
        let downloadElement = document.createElement("a");
        let href = window.URL.createObjectURL(blob);
        downloadElement.href = href;
        downloadElement.download = `${this.currentDate}实时语音.${type == "srt" ? "srt" : type == "file" ? "mp3" : "txt"}`;
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
          .catch(function(err) {
            console.log(err.name + ": " + err.message);
          });
      } else {
        this.microphoneState = 2;
        console.log("无法使用麦克风");
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
      this.audioContext.close();
      this.webSocket.close();
      this.webSocketForProcess.close();
      this.recorder.stop();
    },
    initAnalyser() {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 128;
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
    },
    draw() {
      const canvas = document.getElementById("canvas");
      this.canvasCtx = canvas.getContext("2d");
      let cWidth = this.canvas.width,
        cHeight = this.canvas.height,
        barWidth = parseInt((1.6 * cWidth) / this.bufferLength),
        barHeight,
        x = 0;
      this.canvasCtx.clearRect(0, 0, cWidth, cHeight);
      //分析器获取音频数据“切片”
      this.analyser.getByteFrequencyData(this.dataArray);

      //把每个音频“切片”画在画布上
      for (var i = 0; i < this.bufferLength; i++) {
        barHeight = parseInt(1 * this.dataArray[i]);
        // this.canvasCtx.fillStyle = "rgb(27, 49, 114)";
        let color = `rgb(${i + 27}, ${6 * i + 49},${6 * i + 144})`;
        // console.log(color);
        this.canvasCtx.fillStyle = color;
        this.canvasCtx.fillRect(x, cHeight - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    }
  }
};
</script>
<style lang="scss">
h5 {
  color: #616266;
}
.header {
  height: 5vh;
  min-height: 10px;
  padding: 10px;
}
.el-button {
  margin: 10px;
}
.flex {
  display: flex;
  justify-content: space-between;
}
.container {
  margin-left: 0.5vw;
  width: 48vw;
  height: 400px;
  overflow-y: auto;
}
.container2 {
  margin-right: 0.5vw;
  width: 48vw;
  height: 92vh;
  overflow-y: auto;
}
.canvasContainer {
  margin-left: 0vw;
  width: 48vw;
  height: 38vh;
}
.articalContainer {
  margin-left: 0vw;
  width: 48vw;
  height: 35vh;
  overflow-y: auto;
}
</style>