import { supabase } from './supabase'

export type NotificationType = 
  | 'claim' 
  | 'claim_approved' 
  | 'claim_rejected' 
  | 'message' 
  | 'item_resolved' 
  | 'verification_approved' 
  | 'verification_rejected'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}

/**
 * Create a notification for a user
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  link
}: CreateNotificationParams): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        link: link || null
      })

    if (error) {
      console.error('Error creating notification:', error)
      // Don't throw - notifications are not critical
    }
  } catch (error) {
    console.error('Error creating notification:', error)
  }
}

/**
 * Create notification when someone claims an item
 */
export async function notifyItemOwnerOfClaim(
  itemOwnerId: string,
  itemId: string,
  itemTitle: string,
  claimerEmail?: string
): Promise<void> {
  await createNotification({
    userId: itemOwnerId,
    type: 'claim',
    title: 'New Claim',
    message: `${claimerEmail || 'Someone'} claimed your item: ${itemTitle}`,
    link: `/item/${itemId}`
  })
}

/**
 * Create notification when a claim is approved
 */
export async function notifyClaimerOfApproval(
  claimerId: string,
  itemId: string,
  itemTitle: string
): Promise<void> {
  await createNotification({
    userId: claimerId,
    type: 'claim_approved',
    title: 'Claim Approved!',
    message: `Your claim for "${itemTitle}" has been approved! Contact the owner to arrange pickup.`,
    link: `/item/${itemId}`
  })
}

/**
 * Create notification when a claim is rejected
 */
export async function notifyClaimerOfRejection(
  claimerId: string,
  itemId: string,
  itemTitle: string
): Promise<void> {
  await createNotification({
    userId: claimerId,
    type: 'claim_rejected',
    title: 'Claim Rejected',
    message: `Your claim for "${itemTitle}" was not approved.`,
    link: `/item/${itemId}`
  })
}

/**
 * Create notification when a new message is received
 */
export async function notifyUserOfMessage(
  receiverId: string,
  itemId: string,
  itemTitle: string,
  senderEmail?: string
): Promise<void> {
  await createNotification({
    userId: receiverId,
    type: 'message',
    title: 'New Message',
    message: `${senderEmail || 'Someone'} sent you a message about "${itemTitle}"`,
    link: `/item/${itemId}`
  })
}

/**
 * Create notification when an item is resolved
 */
export async function notifyClaimerOfResolution(
  claimerId: string,
  itemId: string,
  itemTitle: string
): Promise<void> {
  await createNotification({
    userId: claimerId,
    type: 'item_resolved',
    title: 'Item Resolved',
    message: `The item "${itemTitle}" has been marked as resolved.`,
    link: `/item/${itemId}`
  })
}

