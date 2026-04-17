"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import "@/app/superadmin/styles/contentManagement.css";
import "@/app/superadmin/styles/userManagement.css";
import "@/app/styles/RoleSettingsSupport.css";

import ContentTable from "@/app/superadmin/educational-content/components/ContentTable";
import Pagination from "@/app/superadmin/components/Pagination";
import LoadingState from "@/components/admin/LoadingState";

import ModalWrapper from "@/app/superadmin/user-management/modals/ModalWrapper";
import AddContentModal from "@/app/superadmin/educational-content/modals/AddContentModal";
import EditContentModal from "@/app/superadmin/educational-content/modals/EditContentModal";
import DeleteContentModal from "@/app/superadmin/educational-content/modals/DeleteContentModal";
import ViewContentModal from "@/app/superadmin/educational-content/modals/ViewContentModal";
import { EducationalContentRecord } from "@/lib/education/types";

type ModalType = "add" | "edit" | "view" | "delete" | null;

type Props = {
  role: "superadmin" | "regionaladmin";
};

export default function EducationalContentPage({ role }: Props) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedContent, setSelectedContent] =
    useState<EducationalContentRecord | null>(null);
  const [search, setSearch] = useState("");
  const [contents, setContents] = useState<EducationalContentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isSuperAdmin = role === "superadmin";
  const isRegionalAdmin = role === "regionaladmin";

  const [filterType, setFilterType] = useState("all");
  const [filterVisibility, setFilterVisibility] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  async function loadContents() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/content", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        contents?: EducationalContentRecord[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Unable to load educational content.");
      }

      setContents(data.contents || []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load educational content.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadContents();
  }, []);

  const filteredData = useMemo(() => {
    return contents.filter((item) => {
      const matchesSearch = `${item.contentId} ${item.title}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesType = filterType === "all" || item.type === filterType;
      const matchesVisibility =
        filterVisibility === "all" || item.visibility === filterVisibility;

      return matchesSearch && matchesType && matchesVisibility;
    });
  }, [contents, filterType, filterVisibility, search]);

  const totalItems = filteredData.length;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const hasActiveSearchOrFilter =
    search.trim().length > 0 ||
    filterType !== "all" ||
    filterVisibility !== "all";

  async function handleDelete() {
    if (!selectedContent) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch("/api/admin/content", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: selectedContent.id }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete content.");
      }

      setContents((prev) =>
        prev.filter((item) => item.id !== selectedContent.id),
      );
      setSelectedContent(null);
      setActiveModal(null);
    } catch (caughtError) {
      alert(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete content.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const tableContent = isLoading ? (
    <LoadingState label="Loading educational content..." />
  ) : error ? (
    <LoadingState label={error} variant="error" />
  ) : (
    <ContentTable
      data={paginatedData}
      canEdit={isSuperAdmin}
      canDelete={isSuperAdmin}
      emptyStateVariant={hasActiveSearchOrFilter ? "search" : "default"}
      emptyStateTitle={
        hasActiveSearchOrFilter
          ? "No matching educational content found"
          : "No educational content yet"
      }
      emptyStateMessage={
        hasActiveSearchOrFilter
          ? "Try a different title, content ID, or clear the current filters."
          : "Educational resources will appear here once content is added for care teams."
      }
      emptyStateTips={
        hasActiveSearchOrFilter
          ? ["Check spelling", "Try fewer keywords", "Clear filters"]
          : ["Articles and guides", "Video resources", "Regional visibility"]
      }
      onView={(item) => {
        setSelectedContent(item);
        setActiveModal("view");
      }}
      onEdit={
        isSuperAdmin
          ? (item) => {
              setSelectedContent(item);
              setActiveModal("edit");
            }
          : undefined
      }
      onDelete={
        isSuperAdmin
          ? (item) => {
              setSelectedContent(item);
              setActiveModal("delete");
            }
          : undefined
      }
    />
  );

  return (
    <div className="content-page">
      <div className="content-header">
        <div className="role-header">
          <h1>
            {isRegionalAdmin ? "Educational Content Management" : "Educational Content"}
          </h1>
          <p>
            {isRegionalAdmin 
              ? "Review and manage learning resources shared with care teams across your assigned region."
              : "Manage articles, videos, and resources for maternal health education across the system."}
          </p>
        </div>

        {isSuperAdmin && (
          <button className="btn-primary" onClick={() => setActiveModal("add")}>
            + Add Content
          </button>
        )}
      </div>

      <div className="content-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            placeholder="Search by Content ID or Title"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="filter-group">
          <div className="content-filter-select">
            <select
              className="filter-select"
              value={filterType}
              onChange={(event) => {
                setFilterType(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Types</option>
              <option value="link">Link</option>
              <option value="youtube">YouTube Video</option>
              <option value="pdf">PDF</option>
              <option value="video">Video</option>
            </select>
            <span className="content-filter-icon" aria-hidden="true">
              <ChevronDown size={18} />
            </span>
          </div>

          <div className="content-filter-select">
            <select
              className="filter-select"
              value={filterVisibility}
              onChange={(event) => {
                setFilterVisibility(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Visibility</option>
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
            <span className="content-filter-icon" aria-hidden="true">
              <ChevronDown size={18} />
            </span>
          </div>
        </div>
      </div>

      {tableContent}

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      {activeModal && (
        <ModalWrapper
          variant={
            activeModal === "add" || activeModal === "edit"
              ? "content"
              : activeModal === "view"
                ? "view"
                : undefined
          }
          onClose={() => setActiveModal(null)}
        >
          {activeModal === "add" && isSuperAdmin && (
            <AddContentModal
              onClose={() => setActiveModal(null)}
              onSaved={(content) => {
                setContents((prev) => [content, ...prev]);
                setCurrentPage(1);
                setActiveModal(null);
              }}
            />
          )}

          {activeModal === "edit" && isSuperAdmin && selectedContent && (
            <EditContentModal
              content={selectedContent}
              onClose={() => setActiveModal(null)}
              onSaved={(content) => {
                setContents((prev) =>
                  prev.map((item) => (item.id === content.id ? content : item)),
                );
                setSelectedContent(content);
                setActiveModal(null);
              }}
            />
          )}

          {activeModal === "view" && selectedContent && (
            <ViewContentModal
              content={selectedContent}
              onClose={() => setActiveModal(null)}
            />
          )}

          {activeModal === "delete" && isSuperAdmin && selectedContent && (
            <DeleteContentModal
              title={selectedContent.title}
              isSubmitting={isDeleting}
              onClose={() => setActiveModal(null)}
              onDelete={() => void handleDelete()}
            />
          )}
        </ModalWrapper>
      )}
    </div>
  );
}
