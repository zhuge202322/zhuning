import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export const maxDuration = 300; // 长链接时间增加到 5 分钟支持大视频

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let originalName = 'upload.bin';

    // 1. 优先提取文件名，确定物理落盘路径
    if (contentType.includes('multipart/form-data')) {
      // 临时用作占位
      originalName = 'image.png';
    } else {
      const xFilename = req.headers.get('x-filename');
      originalName = xFilename ? decodeURIComponent(xFilename) : 'video.mp4';
    }

    const ext = path.extname(originalName) || '.bin';
    const safeExt = ext.toLowerCase().replace(/[^.a-z0-9]/g, '');

    const hash = crypto.randomBytes(8).toString('hex');
    const filename = `${Date.now()}-${hash}${safeExt}`;
    const localPath = path.join(UPLOAD_DIR, filename);

    // 2. 智能分流落盘
    // A. 标准的 FormData 图片上传分支：使用 arrayBuffer 接收并剥离 Boundary 落盘
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');

      if (!file || !(file instanceof Blob)) {
        return NextResponse.json({ error: 'No file found in formData' }, { status: 400 });
      }

      const realName = (file as any).name || 'upload.png';
      const arrayBuffer = await file.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);

      // 重新哈希命名，防止多次上传重名
      const realExt = path.extname(realName) || '.png';
      const finalFilename = `${Date.now()}-${hash}${realExt}`;
      const finalLocalPath = path.join(UPLOAD_DIR, finalFilename);

      fs.writeFileSync(finalLocalPath, buf);
      console.log(`[File Upload Audit] Mode: FormData, Filename: ${finalFilename}, Size: ${buf.length} bytes`);

      return NextResponse.json({ url: `/uploads/${finalFilename}` });
    } 
    // B. 超大视频 Stream 传输直写分支（支持分片 Chunked 追加，彻底摧毁 Next.js 的 10MB 大小截断瓶颈！）
    else {
      const uploadId = req.headers.get('x-upload-id');
      const chunkIndex = req.headers.get('x-chunk-index');
      const chunkTotal = req.headers.get('x-chunk-total');

      if (!req.body) {
        return NextResponse.json({ error: 'Empty body stream' }, { status: 400 });
      }

      // 如果有分片上传信息
      if (uploadId && chunkIndex !== null && chunkTotal !== null) {
        const cIndex = parseInt(chunkIndex, 10);
        const cTotal = parseInt(chunkTotal, 10);

        // 分片文件的临时中继路径，用 uploadId 作唯一标识
        const chunkTempPath = path.join(UPLOAD_DIR, `temp-${uploadId}${safeExt}`);

        // 直接读取这 2MB 极小片的二进制 Buffer，完全不触发 10MB 爆内存保护！
        const arrayBuffer = await req.arrayBuffer();
        const chunkBuf = Buffer.from(arrayBuffer);

        // 如果是第一片，重置并创建新文件；否则，以二进制流直接追加在文件尾部
        if (cIndex === 0) {
          fs.writeFileSync(chunkTempPath, chunkBuf);
        } else {
          fs.appendFileSync(chunkTempPath, chunkBuf);
        }

        // 打印分片写入审计日志
        console.log(`[File Upload Audit] Chunked Upload - ID: ${uploadId}, Part: ${cIndex + 1}/${cTotal}, Size: ${chunkBuf.length} bytes`);

        // 如果是最后一片，表示上传合并已完全闭合！
        if (cIndex === cTotal - 1) {
          const finalFilename = `${Date.now()}-${hash}${safeExt}`;
          const finalPath = path.join(UPLOAD_DIR, finalFilename);

          // 瞬间秒级更名，大功告成！
          fs.renameSync(chunkTempPath, finalPath);
          const finalStats = fs.statSync(finalPath);

          console.log(`[File Upload Audit] Chunked Success - Combined Filename: ${finalFilename}, Final Size: ${finalStats.size} bytes`);
          return NextResponse.json({ url: `/uploads/${finalFilename}` });
        }

        // 还没完结，返回当前片写入成功的标志
        return NextResponse.json({ success: true, part: cIndex });
      } 
      // 降级：普通的整体视频上传模式（如果文件小于 2MB 会直接全量 Pipe 直写落盘）
      else {
        const nodeStream = Readable.fromWeb(req.body as any);
        const writeStream = fs.createWriteStream(localPath);

        await pipeline(nodeStream, writeStream);

        const stats = fs.statSync(localPath);
        console.log(`[File Upload Audit] Mode: DirectPipe, Filename: ${filename}, Size: ${stats.size} bytes`);

        return NextResponse.json({ url: `/uploads/${filename}` });
      }
    }
  } catch (error: any) {
    console.error('Upload Error Details:', error);
    return NextResponse.json(
      { error: error?.message || 'Server upload internal error' }, 
      { status: 500 }
    );
  }
}
