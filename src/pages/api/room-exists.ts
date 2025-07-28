import type { NextApiRequest, NextApiResponse } from 'next';

import { PrismaClient } from '../../generated/prisma';
const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId } = req.query;
  if (!roomId || typeof roomId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid roomId' });
  }

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    // Wenn kein Raum gefunden, ist das kein Fehler, sondern exists: false
    res.status(200).json({ exists: !!room });
  } catch (error) {
    // Prisma-Fehler abfangen, aber 200 mit exists: false zurückgeben, wenn nur kein Treffer
    if (error.code === 'P2025') {
      return res.status(200).json({ exists: false });
    }
    res.status(500).json({ error: 'Database error', details: String(error) });
  }
}
