import { WebContainer } from '@webcontainer/api';
import { useEffect, useState } from 'react';

interface PreviewFrameProps {
  files: { name: string; content: string }[];
  webContainer: WebContainer;
}

export function PreviewFrame({ webContainer }: PreviewFrameProps) { 
  const [url, setUrl] = useState("");
  
useEffect(() => {
  async function main() {
    const installProcess = await webContainer.spawn('npm', ['install']);

    installProcess.output.pipeTo(new WritableStream({
      write(data) {
        console.log(data);
      }
    }));

    await webContainer.spawn('npm', ['run', 'dev']);
 
    webContainer.on('server-ready', (port, url) => { 
      setUrl(url);
    });
  }
  main();
}, [webContainer])
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      {!url && <div className="text-center">
        <p className="mb-2">Loading...</p>
      </div>}
      {url && <iframe width={"100%"} height={"100%"} src={url} title="Preview Frame" />}
    </div>
  );
}