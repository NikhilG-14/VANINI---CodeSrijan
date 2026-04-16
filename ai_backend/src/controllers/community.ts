import { Request, Response } from 'express';
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

export const getCommunityPosts = async (req: Request, res: Response) => {
    try {
        /*
        const posts = await prisma.communityPost.findMany({
            include: { author: true, comments: true },
            orderBy: { createdAt: 'desc' }
        });
        */
        const mockPosts = [
            { id: '1', title: 'Managing Anxiety in Crowded Zones', author: 'Ash' }
        ];
        
        res.status(200).json({ status: 'success', data: mockPosts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch posts' });
    }
};

export const createCommunityPost = async (req: Request, res: Response) => {
    try {
        const { userId, title, content, tags } = req.body;
        
        /*
        const newPost = await prisma.communityPost.create({
            data: { authorId: userId, title, content, tags }
        });
        */
       
        res.status(201).json({ status: 'success', message: 'Post created safely.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Failed to post' });
    }
};
