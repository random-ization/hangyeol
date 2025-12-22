import { useMemo } from 'react';
import useSWR from 'swr';

// Generic fetcher for SWR
const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

interface HybridDataOptions {
    /** Revalidate on focus */
    revalidateOnFocus?: boolean;
    /** Revalidate on reconnect */
    revalidateOnReconnect?: boolean;
    /** Dedupe interval in ms */
    dedupingInterval?: number;
}

/**
 * Hook to fetch hybrid data from CDN (static) and API (user state)
 * Merges static content with user-specific state (subscriptions, likes, etc.)
 * 
 * @param cdnUrl - URL to static content on CDN (S3/Spaces)
 * @param stateApiUrl - URL to user state API (null if not logged in)
 * @param options - SWR options
 */
export function useHybridData<T = any>(
    cdnUrl: string | null,
    stateApiUrl: string | null,
    options: HybridDataOptions = {}
) {
    const swrOptions = {
        revalidateOnFocus: options.revalidateOnFocus ?? false,
        revalidateOnReconnect: options.revalidateOnReconnect ?? true,
        dedupingInterval: options.dedupingInterval ?? 5000,
    };

    // 1. Fetch Static Content from CDN (cached by browser & CDN)
    const {
        data: content,
        error: contentError,
        isLoading: contentLoading
    } = useSWR(cdnUrl, fetcher, {
        ...swrOptions,
        // Longer revalidation for static content
        refreshInterval: 0,
    });

    // 2. Fetch User State from API (only if user is logged in)
    const {
        data: userState,
        error: stateError,
        isLoading: stateLoading
    } = useSWR(stateApiUrl, fetcher, {
        ...swrOptions,
        // More frequent updates for user state
        refreshInterval: 30000, // 30 seconds
    });

    // 3. Merge Logic - Combine static content with user state
    const mergedData = useMemo(() => {
        if (!content) return null;

        // If no user state (guest user), return content as-is
        if (!userState) return content;

        // If content is an array, merge with user state
        if (Array.isArray(content)) {
            return content.map((item: any) => ({
                ...item,
                isSubscribed: userState.subscribedIds?.includes(item.id) || false,
                isLiked: userState.likedIds?.includes(item.id) || false,
                viewCount: userState.viewCounts?.[item.id] || item.viewCount || 0,
            }));
        }

        // If content is an object with arrays (like trending: { external, internal })
        if (typeof content === 'object') {
            const merged: Record<string, any> = {};
            for (const [key, value] of Object.entries(content)) {
                if (Array.isArray(value)) {
                    merged[key] = value.map((item: any) => ({
                        ...item,
                        isSubscribed: userState.subscribedIds?.includes(item.id) || false,
                        isLiked: userState.likedIds?.includes(item.id) || false,
                    }));
                } else {
                    merged[key] = value;
                }
            }
            return merged;
        }

        return content;
    }, [content, userState]) as T | null;

    return {
        data: mergedData,
        isLoading: contentLoading,
        isError: !!contentError,
        error: contentError || stateError,
        // Expose individual loading states if needed
        isContentLoading: contentLoading,
        isStateLoading: stateLoading,
        // Raw data for advanced use cases
        rawContent: content,
        rawUserState: userState,
    };
}

/**
 * Hook specifically for podcast trending data
 */
export function usePodcastTrending(userId?: string) {
    const cdnUrl = process.env.SPACES_CDN_URL
        ? `${process.env.SPACES_CDN_URL}/cache/podcast-trending.json`
        : '/api/podcasts/trending'; // Fallback to API

    const stateApiUrl = userId ? '/api/podcasts/user-state' : null;

    return useHybridData(cdnUrl, stateApiUrl);
}

/**
 * Hook for podcast feed with user subscriptions
 */
export function usePodcastFeed(userId?: string) {
    // Feed is user-specific, so no CDN caching for content
    const apiUrl = userId ? '/api/podcasts/my-feed' : null;

    const { data, error, isLoading } = useSWR(apiUrl, fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 10000,
    });

    return {
        channels: data?.channels || [],
        episodes: data?.episodes || [],
        isLoading,
        isError: !!error,
    };
}

export default useHybridData;
