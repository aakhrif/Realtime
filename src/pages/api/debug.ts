import { NextApiRequest, NextApiResponse } from 'next';

const debugHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // @ts-expect-error - NextJS Pages API socket server access
    const io = res.socket?.server?.io;
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        REDIS_URL: process.env.REDIS_URL ? 'configured' : 'not configured',
        hostname: process.env.HOSTNAME || 'unknown'
      },
      socketIO: {
        initialized: !!io,
        roomCount: io ? io.sockets.adapter.rooms.size : 0,
        socketCount: io ? io.sockets.sockets.size : 0
      },
      rooms: io ? Array.from(io.sockets.adapter.rooms.entries() as Iterable<[string, Set<string>]>).map(([roomId, sockets]) => ({
        roomId,
        userCount: sockets.size,
        socketIds: Array.from(sockets).slice(0, 3) // First 3 socket IDs
      })) : [],
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };

    res.status(200).json(debugInfo);
  } catch (error) {
    res.status(500).json({
      error: 'Debug info failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export default debugHandler;
