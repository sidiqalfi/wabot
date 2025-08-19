# Media Download Commands

This directory contains platform-specific download commands that were split from the original `dl.js` command. Each command is optimized for a specific platform and has a simplified interface.

## Available Commands

### YouTube Video Download
- **Command**: `ytmp4`
- **Aliases**: `ytvideo`
- **Description**: Download YouTube videos in MP4 format
- **Usage**: `ytmp4 <url> [--720p] [--size <NNMB>] [--start HH:MM:SS] [--end HH:MM:SS] [--format]`
- **Examples**:
  - `ytmp4 https://youtu.be/XXXX`
  - `ytmp4 https://youtube.com/watch?v=XXXX --720p`
  - `ytmp4 https://youtube.com/watch?v=XXXX --size 50MB`
  - `ytmp4 https://youtube.com/watch?v=XXXX --start 00:00:30 --end 00:01:00`
  - `ytmp4 https://youtube.com/watch?v=XXXX --format`

### Features
- Shows video resolution information when sending the video
- Supports quality limiting (--720p), size limits, and video trimming
- Automatically detects and displays video dimensions (e.g., 1920x1080)
- Use --format flag to display available download formats without downloading

### YouTube Audio Download
- **Command**: `ytmp3`
- **Aliases**: `ytaudio`
- **Description**: Download YouTube audio in MP3 format
- **Usage**: `ytmp3 <url> [--size <NNMB>] [--start HH:MM:SS] [--end HH:MM:SS]`
- **Examples**:
  - `ytmp3 https://youtu.be/XXXX`
  - `ytmp3 https://youtube.com/watch?v=XXXX --size 10MB`
  - `ytmp3 https://youtube.com/watch?v=XXXX --start 00:00:30 --end 00:01:00`

### Instagram Download
- **Command**: `instagram`
- **Aliases**: `ig`, `igdl`
- **Description**: Download Instagram videos/photos
- **Usage**: `instagram <url> [--size <NNMB>]`
- **Examples**:
  - `instagram https://instagram.com/p/XXXX`
  - `ig https://www.instagram.com/reel/XXXX`
  - `instagram https://instagram.com/p/XXXX --size 20MB`

### Facebook Download
- **Command**: `facebook`
- **Aliases**: `fb`, `fbdl`
- **Description**: Download Facebook videos
- **Usage**: `facebook <url> [--size <NNMB>]`
- **Examples**:
  - `facebook https://facebook.com/watch?v=XXXX`
  - `fb https://fb.watch/XXXX`
  - `facebook https://facebook.com/watch?v=XXXX --size 30MB`

### TikTok Download
- **Command**: `tiktok`
- **Aliases**: `tt`, `ttdl`
- **Description**: Download TikTok videos
- **Usage**: `tiktok <url> [--size <NNMB>]`
- **Examples**:
  - `tiktok https://tiktok.com/@user/video/XXXX`
  - `tt https://vt.tiktok.com/XXXX`
  - `tiktok https://tiktok.com/@user/video/XXXX --size 15MB`

### Twitter/X Download
- **Command**: `twitter`
- **Aliases**: `x`, `tweet`
- **Description**: Download Twitter/X videos
- **Usage**: `twitter <url> [--size <NNMB>]`
- **Examples**:
  - `twitter https://twitter.com/user/status/XXXX`
  - `x https://x.com/user/status/XXXX`
  - `twitter https://twitter.com/user/status/XXXX --size 25MB`

## Common Options

- `--size <NNMB>`: Limit the file size (e.g., --size 50MB)
- `--start HH:MM:SS`: Start time for trimming (YouTube only)
- `--end HH:MM:SS`: End time for trimming (YouTube only)
- `--720p`: Limit YouTube video quality to 720p or less

## Notes

- All commands use yt-dlp for downloading media
- Files are automatically cleaned up after sending
- Size limits help prevent sending overly large files
- YouTube commands support trimming videos to specific time ranges
- Each command is optimized for its specific platform