class AudioCompiler {
    constructor(inSampleRate = 48000, outSampleRate = 16000, outSampleBits = 16) {
      this.inSampleRate = inSampleRate;
      //输出采样率
      this.outSampleRate = outSampleRate;
      //输出采样数位16
      this.outSampleBits = outSampleBits;
    }
  
    resetSampleRateAndBits(inSampleRate = 48000, outSampleRate = 16000, outSampleBits = 16) {
      //输入采样率
      this.inSampleRate = inSampleRate;
      //输出采样率
      this.outSampleRate = outSampleRate;
      //输出采样数位 8, 16
      this.outSampleBits = outSampleBits;
    }
  
    compress(buffer) {
      let data = new Float32Array(buffer);
      //压缩
      const rawDataion = parseInt(this.inSampleRate / this.outSampleRate);
      let length = data.length / rawDataion;
  
      let compressed = new Float32Array(length);
  
      let index = 0,
        j = 0;
      //间隔抽样
      while (index < length) {
        compressed[index] = data[j];
        j += rawDataion;
        index++;
      }
      return compressed;
    }
  
    convertBuffer(buffer) {
      let compressedBytes = this.compress(buffer);
  
      let sampleBits = this.outSampleBits;
  
      let cbl = compressedBytes.length * (sampleBits / 8);
  
      let covertedBuffer = new ArrayBuffer(cbl);
  
      let covertedBufferData = new DataView(covertedBuffer);
  
      return this.reshapeWavData(sampleBits, 0, compressedBytes, covertedBufferData);
    }
  
    //根据输出bitRate转换音频数据
    reshapeWavData(sampleBits, offset, iBytes, oData) {
      //Float32 => Int8
      if (sampleBits === 8) {
        for (let i = 0; i < iBytes.length; i++, offset++) {
          let s = Math.max(-1, Math.min(1, iBytes[i]));
          let val = s < 0 ? s * 0x8000 : s * 0x7fff;
          val = parseInt(255 / (65535 / (val + 32768)));
          oData.setInt8(offset, val, true);
        }
      } else {
        //Float32 => Int16
        for (let i = 0; i < iBytes.length; i++, offset += 2) {
          let s = Math.max(-1, Math.min(1, iBytes[i]));
          oData.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
      }
      return oData;
    }
  }
  
  export { AudioCompiler };
  