using Microsoft.AspNetCore.SignalR;
using Resonance.Api.DTOs;
using Resonance.Api.Services;

namespace Resonance.Api.Hubs;

public class CommunityHub : Hub
{
    private readonly ICommunityService _communityService;
    private readonly IRealtimeBroadcaster _broadcaster;

    public CommunityHub(ICommunityService communityService, IRealtimeBroadcaster broadcaster)
    {
        _communityService = communityService;
        _broadcaster = broadcaster;
    }

    public static string GetCommunityGroupName(Guid communityId) =>
        RealtimeBroadcaster.GetCommunityGroupName(communityId);

    public Task JoinCommunityChat(Guid communityId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, GetCommunityGroupName(communityId));

    public Task LeaveCommunityChat(Guid communityId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, GetCommunityGroupName(communityId));

    public async Task SendCommunityComment(Guid communityId, CreateCommunityCommentDto dto)
    {
        var result = await _communityService.AddCommentAsync(communityId, dto);
        if (!result.Success || result.Data is null)
        {
            await Clients.Caller.SendAsync("CommunityError", new
            {
                statusCode = result.StatusCode,
                message = result.Error ?? "No se pudo publicar el comentario."
            });
            return;
        }

        await _broadcaster.BroadcastCommunityCommentAsync(communityId, result.Data);
    }

    public async Task DeleteCommunityComment(Guid communityId, Guid commentId, Guid requesterId)
    {
        var result = await _communityService.DeleteCommentAsync(communityId, commentId, requesterId);
        if (!result.Success)
        {
            await Clients.Caller.SendAsync("CommunityError", new
            {
                statusCode = result.StatusCode,
                message = result.Error ?? "No se pudo eliminar el comentario."
            });
            return;
        }

        await _broadcaster.BroadcastCommunityCommentDeletedAsync(communityId, commentId);
    }
}
