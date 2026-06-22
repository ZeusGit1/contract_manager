using ContractManager.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Data;

/// <summary>
/// v2.0 EF Core model — parallel review lanes. See artifacts/docs/dev/plan.md §2 and
/// decisions.md ADR-029 / ADR-031 / ADR-036 / ADR-037.
/// </summary>
public class ContractManagerDbContext : DbContext
{
    public ContractManagerDbContext(DbContextOptions<ContractManagerDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<Contract> Contracts => Set<Contract>();
    public DbSet<ContractLane> ContractLanes => Set<ContractLane>();
    public DbSet<CategoryDefinition> Categories => Set<CategoryDefinition>();
    public DbSet<CategoryField> CategoryFields => Set<CategoryField>();
    public DbSet<ContractFieldValue> ContractFieldValues => Set<ContractFieldValue>();
    public DbSet<ContractAssignment> ContractAssignments => Set<ContractAssignment>();
    public DbSet<ContractComment> ContractComments => Set<ContractComment>();
    public DbSet<ContractNote> ContractNotes => Set<ContractNote>();
    public DbSet<ContractAttachment> ContractAttachments => Set<ContractAttachment>();
    public DbSet<ContractAttachmentBatch> ContractAttachmentBatches => Set<ContractAttachmentBatch>();
    public DbSet<ActivityEvent> ActivityEvents => Set<ActivityEvent>();
    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();
    public DbSet<ReminderSetting> ReminderSettings => Set<ReminderSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(builder =>
        {
            builder.ToTable("Users");
            builder.HasKey(u => u.UserId);
            builder.Property(u => u.UserId).ValueGeneratedNever();
            builder.Property(u => u.DisplayName).HasMaxLength(256).IsRequired();
            builder.Property(u => u.Email).HasMaxLength(320).IsRequired();
            builder.Property(u => u.Department).HasMaxLength(128);
            ConfigureAudit(builder);
            builder.HasQueryFilter(u => !u.IsDeleted);
            builder.HasIndex(u => u.Email).HasFilter("[IsDeleted] = 0").IsUnique();
        });

        modelBuilder.Entity<Vendor>(builder =>
        {
            builder.ToTable("Vendors");
            builder.HasKey(v => v.VendorId);
            builder.Property(v => v.VendorCode).HasMaxLength(32);
            builder.Property(v => v.Name).HasMaxLength(256).IsRequired();
            builder.Property(v => v.Type).HasConversion<int>();
            builder.Property(v => v.PreferredStatus).HasConversion<int>();
            builder.Property(v => v.PrimaryContactName).HasMaxLength(256);
            builder.Property(v => v.PrimaryContactEmail).HasMaxLength(320);
            builder.Property(v => v.PrimaryContactPhone).HasMaxLength(64);
            builder.Property(v => v.PrimaryContactRole).HasMaxLength(128);
            builder.Property(v => v.Location).HasMaxLength(256);
            builder.Property(v => v.VendorSinceText).HasMaxLength(32);
            ConfigureAudit(builder);
            builder.HasQueryFilter(v => !v.IsDeleted);
            builder.HasIndex(v => v.Name).HasFilter("[IsDeleted] = 0").IsUnique();
            builder.HasIndex(v => v.PreferredStatus);
        });

        modelBuilder.Entity<CategoryDefinition>(builder =>
        {
            builder.ToTable("Categories");
            builder.HasKey(c => c.CategoryId);
            builder.Property(c => c.Code).HasMaxLength(32).IsRequired();
            builder.Property(c => c.Label).HasMaxLength(64).IsRequired();
            builder.Property(c => c.IconKey).HasMaxLength(64).IsRequired();
            ConfigureAudit(builder);
            builder.HasQueryFilter(c => !c.IsDeleted);
            builder.HasIndex(c => c.Code).HasFilter("[IsDeleted] = 0").IsUnique();
            builder.HasIndex(c => new { c.IsActive, c.SortOrder });
        });

        modelBuilder.Entity<CategoryField>(builder =>
        {
            builder.ToTable("CategoryFields");
            builder.HasKey(f => f.CategoryFieldId);
            builder.Property(f => f.FieldKey).HasMaxLength(64).IsRequired();
            builder.Property(f => f.Label).HasMaxLength(128).IsRequired();
            builder.Property(f => f.Type).HasConversion<int>();
            builder.Property(f => f.HelperText).HasMaxLength(512);
            ConfigureAudit(builder);
            builder.HasQueryFilter(f => !f.IsDeleted);
            builder.HasIndex(f => new { f.CategoryId, f.FieldKey }).HasFilter("[IsDeleted] = 0").IsUnique();
            builder.HasIndex(f => new { f.CategoryId, f.IsActive, f.SortOrder });
            builder.HasOne(f => f.Category).WithMany(c => c.Fields)
                .HasForeignKey(f => f.CategoryId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Contract>(builder =>
        {
            builder.ToTable("Contracts");
            builder.HasKey(c => c.ContractId);
            builder.Property(c => c.ContractNumber).HasMaxLength(24).IsRequired();
            builder.Property(c => c.Title).HasMaxLength(256).IsRequired();
            builder.Property(c => c.Category).HasConversion<int>();
            builder.Property(c => c.OverallStatus).HasConversion<int>();
            builder.Property(c => c.Priority).HasConversion<int>();
            builder.Property(c => c.RequesterEmail).HasMaxLength(320).IsRequired();
            builder.Property(c => c.TotalCostUsd).HasColumnType("decimal(18,2)");
            builder.Property(c => c.EventName).HasMaxLength(256);
            builder.Property(c => c.VenueLocation).HasMaxLength(256);
            builder.Property(c => c.ParentEventName).HasMaxLength(256);
            builder.Property(c => c.Building).HasMaxLength(256);
            builder.Property(c => c.ITType).HasConversion<int?>();
            builder.Property(c => c.ApplicationName).HasMaxLength(256);
            builder.Property(c => c.ApplicationVersion).HasMaxLength(128);
            builder.Property(c => c.LicensingType).HasConversion<int?>();
            builder.Property(c => c.CloudOrOnPrem).HasConversion<int?>();
            ConfigureAudit(builder);
            builder.HasQueryFilter(c => !c.IsDeleted);
            builder.HasIndex(c => c.ContractNumber).HasFilter("[IsDeleted] = 0").IsUnique();
            builder.HasIndex(c => c.VendorId);
            builder.HasIndex(c => c.RequesterUserId);
            builder.HasIndex(c => c.ProcurementOwnerUserId);
            builder.HasIndex(c => c.OverallStatus).HasFilter("[OverallStatus] = 1"); // filtered: active hot path
            builder.HasIndex(c => new { c.Category, c.Priority });
            builder.HasIndex(c => c.TermEndDate);
            builder.HasIndex(c => c.LastActionAt);

            builder.HasOne(c => c.Vendor).WithMany(v => v.Contracts)
                .HasForeignKey(c => c.VendorId).OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(c => c.Requester).WithMany()
                .HasForeignKey(c => c.RequesterUserId).OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(c => c.ProcurementOwner).WithMany()
                .HasForeignKey(c => c.ProcurementOwnerUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ContractLane>(builder =>
        {
            builder.ToTable("ContractLanes");
            builder.HasKey(l => l.ContractLaneId);
            builder.Property(l => l.LaneId).HasConversion<int>();
            builder.Property(l => l.Status).HasConversion<int>();
            builder.Property(l => l.OwnerLabel).HasMaxLength(256);
            ConfigureAudit(builder);
            // ContractLane is NOT soft-deletable — ADR-030 (9-row invariant).
            // Cancellation/N-A is absorbed by Status. No query filter applied.
            builder.HasIndex(l => l.ContractId);
            builder.HasIndex(l => new { l.ContractId, l.LaneId }).IsUnique();
            // Filtered index for "My active lanes" — (in_review, waiting)
            builder.HasIndex(l => new { l.OwnerUserId, l.ContractId })
                .HasFilter("[Status] IN (2, 3)"); // InReview=2, Waiting=3
            builder.HasOne(l => l.Contract).WithMany(c => c.Lanes)
                .HasForeignKey(l => l.ContractId).OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(l => l.Owner).WithMany()
                .HasForeignKey(l => l.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ContractFieldValue>(builder =>
        {
            builder.ToTable("ContractFieldValues");
            builder.HasKey(v => v.ContractFieldValueId);
            builder.Property(v => v.FieldKey).HasMaxLength(64).IsRequired();
            ConfigureAudit(builder);
            builder.HasQueryFilter(v => !v.IsDeleted);
            builder.HasIndex(v => new { v.ContractId, v.CategoryFieldId })
                .HasFilter("[IsDeleted] = 0").IsUnique();
            builder.HasIndex(v => v.FieldKey);
            builder.HasOne(v => v.Contract).WithMany(c => c.FieldValues)
                .HasForeignKey(v => v.ContractId).OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(v => v.CategoryField).WithMany()
                .HasForeignKey(v => v.CategoryFieldId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ContractAssignment>(builder =>
        {
            builder.ToTable("ContractAssignments");
            builder.HasKey(a => a.ContractAssignmentId);
            builder.Property(a => a.ReviewerTeam).HasConversion<int>();
            ConfigureAudit(builder);
            builder.HasQueryFilter(a => !a.IsDeleted);
            builder.HasIndex(a => a.ContractId);
            builder.HasIndex(a => a.ReviewerUserId);
            builder.HasIndex(a => new { a.ContractId, a.ReviewerUserId }).HasFilter("[IsDeleted] = 0").IsUnique();
            builder.HasOne(a => a.Contract).WithMany(c => c.Assignments)
                .HasForeignKey(a => a.ContractId).OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(a => a.Reviewer).WithMany()
                .HasForeignKey(a => a.ReviewerUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ContractComment>(builder =>
        {
            builder.ToTable("ContractComments");
            builder.HasKey(c => c.ContractCommentId);
            builder.Property(c => c.AuthorRoleSnapshot).HasMaxLength(64).IsRequired();
            ConfigureAudit(builder);
            builder.HasQueryFilter(c => !c.IsDeleted);
            builder.HasIndex(c => c.ContractId);
            builder.HasOne(c => c.Contract).WithMany(co => co.Comments)
                .HasForeignKey(c => c.ContractId).OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(c => c.Author).WithMany()
                .HasForeignKey(c => c.AuthorUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ContractNote>(builder =>
        {
            builder.ToTable("ContractNotes");
            builder.HasKey(n => n.ContractNoteId);
            builder.Property(n => n.Type).HasConversion<int>();
            builder.Property(n => n.Participants).HasMaxLength(512);
            ConfigureAudit(builder);
            builder.HasQueryFilter(n => !n.IsDeleted);
            builder.HasIndex(n => n.ContractId);
            builder.HasOne(n => n.Contract).WithMany(c => c.Notes)
                .HasForeignKey(n => n.ContractId).OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(n => n.Author).WithMany()
                .HasForeignKey(n => n.AuthorUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ContractAttachmentBatch>(builder =>
        {
            builder.ToTable("ContractAttachmentBatches");
            builder.HasKey(b => b.BatchId);
            builder.Property(b => b.Status).HasConversion<int>();
            ConfigureAudit(builder);
            builder.HasQueryFilter(b => !b.IsDeleted);
            builder.HasIndex(b => b.ContractId);
            // Restrict (not Cascade) to avoid multi-path cascade with ContractAttachment.Contract.
            // Soft-delete is the operational mode anyway.
            builder.HasOne(b => b.Contract).WithMany()
                .HasForeignKey(b => b.ContractId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ContractAttachment>(builder =>
        {
            builder.ToTable("ContractAttachments");
            builder.HasKey(a => a.ContractAttachmentId);
            builder.Property(a => a.BlobPath).HasMaxLength(512).IsRequired();
            builder.Property(a => a.FileName).HasMaxLength(256).IsRequired();
            builder.Property(a => a.ContentType).HasMaxLength(128).IsRequired();
            builder.Property(a => a.Status).HasConversion<int>();
            ConfigureAudit(builder);
            builder.HasQueryFilter(a => !a.IsDeleted);
            builder.HasIndex(a => a.ContractId);
            builder.HasIndex(a => a.BatchId);
            builder.HasIndex(a => a.AttachmentGuid).IsUnique();
            builder.HasOne(a => a.Contract).WithMany(c => c.Attachments)
                .HasForeignKey(a => a.ContractId).OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(a => a.Batch).WithMany()
                .HasForeignKey(a => a.BatchId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ActivityEvent>(builder =>
        {
            builder.ToTable("ActivityEvents");
            builder.HasKey(e => e.ActivityEventId);
            builder.Property(e => e.Type).HasConversion<int>();
            builder.Property(e => e.DescriptionLine).HasMaxLength(512).IsRequired();
            ConfigureAudit(builder);
            // ActivityEvents are append-only — no soft-delete query filter required
            builder.HasIndex(e => new { e.ContractId, e.OccurredAt });
            builder.HasOne(e => e.Contract).WithMany(c => c.ActivityEvents)
                .HasForeignKey(e => e.ContractId).OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(e => e.Actor).WithMany()
                .HasForeignKey(e => e.ActorUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<NotificationLog>(builder =>
        {
            builder.ToTable("NotificationLogs");
            builder.HasKey(n => n.NotificationLogId);
            builder.Property(n => n.TargetLaneId).HasConversion<int>();
            builder.Property(n => n.Channel).HasConversion<int>();
            builder.Property(n => n.Status).HasConversion<int>();
            builder.Property(n => n.RecipientLabel).HasMaxLength(512);
            builder.Property(n => n.RecipientEmail).HasMaxLength(320);
            builder.Property(n => n.Subject).HasMaxLength(256).IsRequired();
            builder.Property(n => n.FailureReason).HasMaxLength(512);
            ConfigureAudit(builder);
            builder.HasIndex(n => n.ContractId);
            builder.HasIndex(n => n.SentAt);
            builder.HasOne(n => n.Contract).WithMany()
                .HasForeignKey(n => n.ContractId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReminderSetting>(builder =>
        {
            builder.ToTable("ReminderSettings");
            builder.HasKey(r => r.ReminderSettingId);
            builder.Property(r => r.Category).HasConversion<int>();
            builder.Property(r => r.TemplateBody).IsRequired();
            ConfigureAudit(builder);
            builder.HasQueryFilter(r => !r.IsDeleted);
            builder.HasIndex(r => r.Category).HasFilter("[IsDeleted] = 0").IsUnique();
        });
    }

    private static void ConfigureAudit<TEntity>(Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntity> builder)
        where TEntity : AuditEntity
    {
        builder.Property(e => e.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(e => e.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(e => e.CreatedBy).HasMaxLength(256).IsRequired();
        builder.Property(e => e.UpdatedBy).HasMaxLength(256).IsRequired();
    }
}
