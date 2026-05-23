import amqp from "amqplib";
import { redisClient } from "../server.js";
import { sql } from "./db.js";

interface CacheInvalidationMessage {
    action:string;
    keys:string[];
}

export const startCacheConsumer = async()=>{
    try {
        const connection = await amqp.connect({
            protocol: process.env.RABBITMQ_PROTOCOL || "amqp",
            hostname: process.env.RABBITMQ_HOST,
            port: Number(process.env.RABBITMQ_PORT) || 5672,
            username: process.env.RABBITMQ_USER || "admin",
            password: process.env.RABBITMQ_PASS || "admin123",
        });
       const channel = await connection.createChannel();

       const queueName = "Cache-invalidation";
       await channel.assertQueue(queueName,{durable:true});
       console.log("👌 Blog service cache consumer started");
       
       channel.consume(queueName,async(msg)=>{
        if(msg){
            try {
                const content = JSON.parse(msg.content.toString()) as CacheInvalidationMessage;
                console.log("📩 Blog service received cache invalidation message", content);

                if(content.action === "invalidateChache"){
                    for(const pattern of content.keys){
                        try {
                            const keys = await redisClient.keys(pattern)
                            if(keys.length > 0){
                                await redisClient.del(keys);
                                console.log(`✅ Blog service invalidated ${keys.length} cache keys matching: ${pattern}`);
                            } else {
                                console.log(`ℹ️ No cache keys found matching: ${pattern}`);
                            }
                        } catch {
                            console.warn(`Redis unavailable — skipping invalidation for pattern: ${pattern}`);
                        }
                    }
                    
                    try {
                        const defaultKey = "blogs:all:all:10:first";
                        const blogs = await sql`SELECT id, title, description, image, category, author, create_at FROM blogs ORDER BY id DESC LIMIT 11`;
                        const hasMore = blogs.length > 10;
                        if (hasMore) blogs.pop();
                        const nextCursor = hasMore && blogs.length > 0 ? String(blogs[blogs.length - 1]!.id) : null;
                        await redisClient.setEx(defaultKey, 1800, JSON.stringify({
                            blogs,
                            pagination: { limit: 10, nextCursor, hasMore },
                        }));
                        console.log(" Default cache rebuilt for key:", defaultKey);
                    } catch {
                        console.warn("Redis unavailable — skipping proactive cache rebuild");
                    }
                }
                channel.ack(msg)
            } 
           
            catch (error) {
                console.error("❌ Error processing cache invalidation in blog service:", error);
                channel.nack(msg, false, true);
            }
        }
       })
       
    } catch (error) {
        console.error("❌ Failed to start rabbitmq Consumer:", error);
        
    }
}